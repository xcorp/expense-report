import React, { useState, useRef } from 'react';
import { db, Expense } from '../db';
import imageCompression from 'browser-image-compression';
import { translations } from '../i18n';
import { CATEGORIES, DRIVING_COST_MULTIPLIER, GOOGLE_MAPS_API_KEY } from '../config';
import Tesseract from 'tesseract.js';

interface ExpenseFormProps {
  expense?: Expense | null;
  onEditDone?: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expense, onEditDone }) => {
  const defaultDescriptionText = 'En kort beskrivning om vad utlägget gäller';
  const defaultPurposeText = 'En kort anledning som motiverar resan';
  const [description, setDescription] = useState(expense?.description || defaultDescriptionText);
  const [category, setCategory] = useState(expense?.category && (CATEGORIES.includes(expense.category) || expense.category === 'Övrigt') ? expense.category : CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState(expense && !CATEGORIES.includes(expense.category) && expense.category !== 'Övrigt' ? expense.category : '');
  const [isDriving, setIsDriving] = useState(!!(expense && expense.purpose));
  const [purpose, setPurpose] = useState(expense?.purpose || defaultPurposeText);
  const [passengers, setPassengers] = useState(expense?.passengers || '');
  const [distanceKm, setDistanceKm] = useState(expense?.distanceKm ? String(expense.distanceKm) : '');
  const [cost, setCost] = useState(expense ? String(expense.cost) : '');
  const [image, setImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [useRouteCalculator, setUseRouteCalculator] = useState(false);
  const [stops, setStops] = useState<string[]>(['', '']);
  const [calculatedDistanceKm, setCalculatedDistanceKm] = useState('');
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [distanceCalculationError, setDistanceCalculationError] = useState<string | null>(null);
  const [stopSuggestions, setStopSuggestions] = useState<Record<number, Array<{ name: string; placeId: string }>>>({});
  const [analyzeReceiptLoading, setAnalyzeReceiptLoading] = useState(false);
  const [analyzeReceiptError, setAnalyzeReceiptError] = useState<string | null>(null);

  const descriptionRef = useRef<HTMLInputElement>(null);
  const purposeRef = useRef<HTMLInputElement>(null);
  const passengersRef = useRef<HTMLInputElement>(null);
  const distanceRef = useRef<HTMLInputElement>(null);
  const costRef = useRef<HTMLInputElement>(null);
  const customCategoryRef = useRef<HTMLInputElement>(null);
  const debounceTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const directionsServiceRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);

  React.useEffect(() => {
    if (expense && expense.image) {
      const blob = new Blob([expense.image], { type: expense.imageType || 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setExistingImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setExistingImageUrl(null);
    }
  }, [expense]);

  React.useEffect(() => {
    setDescription(expense?.description || defaultDescriptionText);
    setCategory(expense?.category && (CATEGORIES.includes(expense.category) || expense.category === 'Övrigt') ? expense.category : CATEGORIES[0]);
    setCustomCategory(expense && !CATEGORIES.includes(expense.category) ? expense.category : '');
    setIsDriving(!!(expense && expense.purpose));
    setPurpose(expense?.purpose || defaultPurposeText);
    setPassengers(expense?.passengers || '');
    setDistanceKm(expense?.distanceKm ? String(expense.distanceKm) : '');
    setCost(expense ? String(expense.cost) : '');
    setImage(null);

    // Load stops if they exist
    if (expense?.stops && expense.stops.length > 0) {
      setStops(expense.stops);
      setUseRouteCalculator(true);
      setCalculatedDistanceKm(expense.calculatedDistanceKm ? String(expense.calculatedDistanceKm) : '');
    } else {
      setStops(['', '']);
      setUseRouteCalculator(false);
      setCalculatedDistanceKm('');
    }
  }, [expense]);

  // Cleanup debounce timers on unmount
  React.useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Load Google Maps API
  React.useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.length === 0) {
      return;
    }

    const loadGoogleMapsAPI = async () => {
      // DirectionsService doesn't need a map
      directionsServiceRef.current = new (window as any).google.maps.DirectionsService();

      // AutocompleteService doesn't need a map either
      autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
    };

    // Check if script is already loaded
    if ((window as any).google?.maps) {
      loadGoogleMapsAPI();
    } else {
      // Load the Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,directions`;
      script.async = true;
      script.onload = loadGoogleMapsAPI;
      document.head.appendChild(script);
    }
  }, [GOOGLE_MAPS_API_KEY]);

  const calculateRouteDistance = async () => {
    if (stops.some(stop => !stop.trim())) {
      setDistanceCalculationError('Vänligen fyll i alla adresser');
      return;
    }

    setCalculatingDistance(true);
    setDistanceCalculationError(null);

    try {
      if (!directionsServiceRef.current) {
        throw new Error('Google Maps API är inte laddat');
      }

      // Build waypoints array
      const waypoints = stops.slice(1, -1).map(stop => ({
        location: stop,
        stopover: true
      }));

      const request = {
        origin: stops[0],
        destination: stops[stops.length - 1],
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        travelMode: (window as any).google.maps.TravelMode.DRIVING
      };

      const result = await new Promise((resolve, reject) => {
        directionsServiceRef.current.route(request, (result: any, status: any) => {
          if (status === (window as any).google.maps.DirectionsStatus.OK) {
            resolve(result);
          } else if (status === (window as any).google.maps.DirectionsStatus.ZERO_RESULTS) {
            reject(new Error('Kunde inte hitta en rutt för de angivna adresserna'));
          } else {
            reject(new Error(`Misslyckades att beräkna rutten: ${status}`));
          }
        });
      });

      // Sum all legs to get total distance (in meters)
      const totalDistanceMeters = (result as any).routes[0].legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
      // Convert to km and round to nearest whole km
      const distanceInKm = Math.round(totalDistanceMeters / 1000).toString();

      setCalculatedDistanceKm(distanceInKm);
      // Only set distanceKm if it's empty (user hasn't entered custom distance)
      if (!distanceKm) {
        setDistanceKm(distanceInKm);
      }
      // Use custom distance if entered, otherwise use calculated
      const finalDistance = distanceKm || distanceInKm;
      setCost((Number(finalDistance) * DRIVING_COST_MULTIPLIER || 0).toFixed(2));
      setDistanceCalculationError(null);
    } catch (error) {
      setDistanceCalculationError(error instanceof Error ? error.message : 'Fel vid beräkning av avstånd');
    } finally {
      setCalculatingDistance(false);
    }
  };

  const analyzeReceipt = async () => {
    if (!image && !existingImageUrl) {
      setAnalyzeReceiptError('Vänligen ladda upp en bild först');
      return;
    }

    setAnalyzeReceiptLoading(true);
    setAnalyzeReceiptError(null);

    try {
      const imageSource = image ? image : existingImageUrl;

      const result = await (Tesseract as any).recognize(imageSource, 'swe', {
        logger: () => { } // Silent progress
      });

      const text = result.data.text;

      // Look for Swedish currency patterns (total/sum)
      const totalPatterns = [
        /totalt[:\s]+([0-9]+[.,][0-9]{2})/gi,
        /summa[:\s]+([0-9]+[.,][0-9]{2})/gi,
        /total[:\s]+([0-9]+[.,][0-9]{2})/gi,
        /att betala[:\s]+([0-9]+[.,][0-9]{2})/gi,
      ];

      let foundAmount: string | null = null;

      for (const pattern of totalPatterns) {
        const match = text.match(pattern);
        if (match) {
          // Extract the number part
          const numberMatch = match[0].match(/([0-9]+[.,][0-9]{2})/);
          if (numberMatch) {
            foundAmount = numberMatch[1].replace(',', '.');
            break;
          }
        }
      }

      if (foundAmount) {
        setCost(foundAmount);
        setAnalyzeReceiptError(null);
        try { (window as any).__USE_TOAST__?.push({ message: `Hittade belopp: ${foundAmount} kr`, type: 'success' }); }
        catch { alert(`Hittade belopp: ${foundAmount} kr`); }
      } else {
        setAnalyzeReceiptError('Kunde inte hitta något belopp på kvittot. Vänligen ange manuellt.');
      }
    } catch (error) {
      setAnalyzeReceiptError('Fel vid analys av kvitto. Vänligen ange belopp manuellt.');
      console.error('OCR error:', error);
    } finally {
      setAnalyzeReceiptLoading(false);
    }
  };

  const moveStop = (index: number, direction: 'up' | 'down') => {
    const newStops = [...stops];
    if (direction === 'up' && index > 0) {
      [newStops[index], newStops[index - 1]] = [newStops[index - 1], newStops[index]];
      setStops(newStops);
    } else if (direction === 'down' && index < newStops.length - 1) {
      [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
      setStops(newStops);
    }
  };

  const handleAddressInput = (index: number, value: string) => {
    const newStops = [...stops];
    newStops[index] = value;
    setStops(newStops);
    setDistanceCalculationError(null);

    // Clear previous timer for this index
    if (debounceTimersRef.current[index]) {
      clearTimeout(debounceTimersRef.current[index]);
    }

    // Only search if value is long enough
    if (value.length > 2) {
      // Set new timer
      debounceTimersRef.current[index] = setTimeout(() => {
        try {
          if (!autocompleteServiceRef.current) {
            return; // Silently skip if AutocompleteService not ready
          }

          const request = {
            input: value,
            componentRestrictions: { country: 'se' }
          };

          autocompleteServiceRef.current.getPlacePredictions(request, (predictions: any, status: any) => {
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
              const suggestions = predictions.map((prediction: any) => ({
                name: prediction.description,
                placeId: prediction.place_id
              }));

              setStopSuggestions(prev => ({
                ...prev,
                [index]: suggestions
              }));
            } else {
              // Clear suggestions on error or zero results
              setStopSuggestions(prev => ({
                ...prev,
                [index]: []
              }));
            }
          });
        } catch (error) {
          // Silently fail on suggestions
        }
      }, 300);
    } else {
      setStopSuggestions(prev => ({
        ...prev,
        [index]: []
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      const isHeic = /heic|heif/i.test(file.type) || /\.heic$/i.test(file.name);
      if (isHeic) {
        import('heic2any')
          .then((heic2any) => (heic2any && (heic2any as any).default) ? (heic2any as any).default({ blob: file, toType: 'image/jpeg' }) : (heic2any as any)({ blob: file, toType: 'image/jpeg' }))
          .then((convertedBlob: Blob) => {
            const jpegFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
            setImage(jpegFile);
          })
          .catch(() => {
            try { (window as any).__USE_TOAST__?.push({ message: 'Failed to process HEIC image. Please convert to JPEG and try again.', type: 'error' }); }
            catch { alert('Failed to process HEIC image. Please convert to JPEG and try again.'); }
            setImage(null);
          });
      } else {
        setImage(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const empty: string[] = [];

    if (isDriving) {
      if (!purpose || purpose === defaultPurposeText || purpose.trim() === '') empty.push('purpose');
      if (!passengers || passengers.trim() === '') empty.push('passengers');
      if (!distanceKm || Number(distanceKm) <= 0) empty.push('distance');
    } else {
      if (!description || description === defaultDescriptionText || description.trim() === '') empty.push('description');
      if (!cost || parseFloat(cost) <= 0) empty.push('cost');
    }

    if (!category || (category === 'Övrigt' && (!customCategory || customCategory.trim() === ''))) {
      empty.push('category');
    }

    if (empty.length > 0) {
      setInvalidFields(empty);
      try { (window as any).__USE_TOAST__?.push({ message: 'Vänligen fyll i alla obligatoriska fält', type: 'info' }); } catch { alert('Vänligen fyll i alla obligatoriska fält'); }

      // Focus the first empty field
      if (empty[0] === 'description') descriptionRef.current?.focus();
      else if (empty[0] === 'purpose') purposeRef.current?.focus();
      else if (empty[0] === 'passengers') passengersRef.current?.focus();
      else if (empty[0] === 'distance') distanceRef.current?.focus();
      else if (empty[0] === 'cost') costRef.current?.focus();
      else if (empty[0] === 'category') customCategoryRef.current?.focus();

      setIsSubmitting(false);
      return;
    }

    setInvalidFields([]);

    let imageBuffer: ArrayBuffer | undefined = undefined;
    let imageType: string | undefined = undefined;
    if (image) {
      if (image.type === 'application/pdf') {
        imageBuffer = await image.arrayBuffer();
        imageType = image.type;
      } else {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
        imageBuffer = await (await imageCompression(image as File, options)).arrayBuffer();
        imageType = image.type;
      }
    } else if (expense && expense.image) {
      imageBuffer = expense.image;
      imageType = expense.imageType;
    } else {
      imageBuffer = new ArrayBuffer(0);
      imageType = undefined;
    }

    const isOtherCategory = category === 'Övrigt';
    const finalCategory = isOtherCategory ? customCategory : category;
    const expenseToAdd: any = {
      category: finalCategory,
      image: imageBuffer,
      imageType,
      createdAt: new Date(),
    };

    if (isDriving) {
      expenseToAdd.description = purpose;
      expenseToAdd.purpose = purpose;
      expenseToAdd.passengers = passengers;
      expenseToAdd.distanceKm = Number(distanceKm);
      expenseToAdd.cost = Number(distanceKm) * DRIVING_COST_MULTIPLIER;
      if (useRouteCalculator && stops.length > 0) {
        expenseToAdd.stops = stops;
        if (calculatedDistanceKm) {
          expenseToAdd.calculatedDistanceKm = Number(calculatedDistanceKm);
        }
      }
    } else {
      expenseToAdd.description = description;
      expenseToAdd.cost = parseFloat(cost);
    }

    try {
      if (expense && expense.id) {
        await db.expenses.update(expense.id, expenseToAdd);
        if (onEditDone) onEditDone();
      } else {
        await db.expenses.add(expenseToAdd);
      }

      setDescription('');
      setCategory(CATEGORIES[0]);
      setCustomCategory('');
      setPurpose('');
      setPassengers('');
      setDistanceKm('');
      setCalculatedDistanceKm('');
      setCost('');
      setIsDriving(false);
      setImage(null);
      if (onEditDone) onEditDone();
      const fileInput = document.getElementById('image-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error(translations['Failed to add expense:'], error);
      try { (window as any).__USE_TOAST__?.push({ message: translations['Failed to add expense:'], type: 'error' }); }
      catch { alert(translations['Failed to add expense:']); }
    } finally {
      setIsSubmitting(false);
    }
  };

  const imagePreview = existingImageUrl && !image ? (
    <div className="mt-2">
      <img src={existingImageUrl} alt="Preview" className="w-32 h-32 object-cover rounded" />
      <div className="text-xs text-gray-500 mt-1">Current image</div>
    </div>
  ) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg border-2 border-gray-300 dark:border-gray-700 max-w-md mx-auto text-gray-900 dark:text-gray-100">
      <div className="flex items-center space-x-4">
        <label className="inline-flex items-center">
          <input type="checkbox" checked={isDriving} onChange={(e) => setIsDriving(e.target.checked)} className="mr-2" />
          <span className="text-sm">{translations['Driving']}</span>
        </label>
      </div>
      {isDriving ? (
        <>
          <div>
            <label htmlFor="purpose" className="form-label">
              {translations['Purpose of trip']}
            </label>
            <input
              ref={purposeRef}
              type="text"
              id="purpose"
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                setInvalidFields(invalidFields.filter(f => f !== 'purpose'));
              }}
              onFocus={(e) => {
                if (e.target.value === defaultPurposeText) {
                  setPurpose('');
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setPurpose(defaultPurposeText);
                }
              }}
              placeholder="T.ex Distriksårmöte eller Kärran Höstläger"
              className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('purpose') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
              required
            />
          </div>
          <div>
            <label htmlFor="passengers" className="form-label">
              {translations['Passengers']}
            </label>
            <input
              ref={passengersRef}
              type="text"
              id="passengers"
              value={passengers}
              onChange={(e) => {
                setPassengers(e.target.value);
                setInvalidFields(invalidFields.filter(f => f !== 'passengers'));
              }}
              className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('passengers') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            />
          </div>
          <div>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setUseRouteCalculator(false);
                  setDistanceCalculationError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${!useRouteCalculator
                  ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                Manuell
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseRouteCalculator(true);
                  setDistanceCalculationError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${useRouteCalculator
                  ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                Rutt-kalkylator
              </button>
            </div>
            <label className="form-label block mb-2">
              {translations['Distance (km)']}
            </label>

            {useRouteCalculator ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Ange minst 2 stopp (startpunkt och destination). <span className="italic">Tips: 3 stopp om du återvänder samma väg</span>
                </p>
                {stops.map((stop, index) => (
                  <div key={index}>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`stop-${index}`} className="text-xs text-gray-600 dark:text-gray-400 flex-1">
                        {index === 0 ? 'Startpunkt' : index === stops.length - 1 ? 'Destination' : `Stopp ${index}`}
                      </label>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => moveStop(index, 'up')}
                          className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                          title="Flytta upp"
                        >
                          ↑
                        </button>
                      )}
                      {index < stops.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveStop(index, 'down')}
                          className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                          title="Flytta ner"
                        >
                          ↓
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id={`stop-${index}`}
                        type="text"
                        value={stop}
                        onChange={(e) => handleAddressInput(index, e.target.value)}
                        placeholder={index === 0 ? 'T.ex. Hemmet' : index === stops.length - 1 ? 'T.ex. Hemmet' : `Stopp ${index}`}
                        className="mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 border-gray-300 dark:border-gray-700"
                      />
                      {stopSuggestions[index] && stopSuggestions[index].length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {stopSuggestions[index].map((suggestion, suggestionIndex) => (
                            <button
                              key={suggestionIndex}
                              type="button"
                              onClick={() => {
                                const newStops = [...stops];
                                newStops[index] = suggestion.name;
                                setStops(newStops);
                                setStopSuggestions(prev => ({
                                  ...prev,
                                  [index]: []
                                }));
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-indigo-100 dark:hover:bg-indigo-900 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                            >
                              {suggestion.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setStops([...stops, ''])}
                  className="text-sm text-indigo-700 dark:text-indigo-400 hover:underline mt-2"
                >
                  + Lägg till stopp
                </button>
                {stops.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setStops(stops.slice(0, -1))}
                    className="text-sm text-red-700 dark:text-red-400 hover:underline mt-1 ml-2"
                  >
                    - Ta bort sista stopp
                  </button>
                )}
                <button
                  type="button"
                  onClick={calculateRouteDistance}
                  disabled={calculatingDistance}
                  className="w-full mt-3 py-2 px-3 rounded-md bg-indigo-700 text-white hover:bg-indigo-800 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {calculatingDistance ? 'Beräknar...' : 'Beräkna avstånd'}
                </button>
                {distanceCalculationError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">{distanceCalculationError}</p>
                )}
                {calculatedDistanceKm && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Beräknat avstånd: {calculatedDistanceKm} km
                    </p>
                    <div className="border-2 border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:green|label:A|${encodeURIComponent(stops[0])}&markers=color:red|label:B|${encodeURIComponent(stops[stops.length - 1])}${stops.slice(1, -1).map((stop, idx) => `&markers=color:blue|label:${idx + 2}|${encodeURIComponent(stop)}`).join('')}&path=color:0x0000ff|weight:3${stops.map(stop => `|${encodeURIComponent(stop)}`).join('')}&key=${GOOGLE_MAPS_API_KEY}`}
                        alt="Route map"
                        className="w-full h-auto"
                      />
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/${stops.map(stop => encodeURIComponent(stop)).join('/')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Öppna i Google Maps
                    </a>
                    <div>
                      <label htmlFor="customDistance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Anpassat avstånd (valfritt)
                      </label>
                      <input
                        ref={distanceRef}
                        type="number"
                        id="customDistance"
                        value={distanceKm}
                        onChange={(e) => {
                          setDistanceKm(e.target.value);
                          const finalDistance = e.target.value || calculatedDistanceKm;
                          setCost((Number(finalDistance) * DRIVING_COST_MULTIPLIER || 0).toFixed(2));
                          setInvalidFields(invalidFields.filter(f => f !== 'distance'));
                        }}
                        placeholder={`Standard: ${calculatedDistanceKm} km`}
                        className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('distance') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                      />
                      {distanceKm && distanceKm !== calculatedDistanceKm && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Använder anpassat avstånd för beräkning
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <input
                ref={distanceRef}
                type="number"
                id="distance"
                value={distanceKm}
                onChange={(e) => {
                  setDistanceKm(e.target.value);
                  setCost((Number(e.target.value) * DRIVING_COST_MULTIPLIER || 0).toFixed(2));
                  setInvalidFields(invalidFields.filter(f => f !== 'distance'));
                }}
                className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('distance') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                step="0.1"
                min="0"
                required
              />
            )}
          </div>
          <div>
            <label htmlFor="cost" className="form-label">
              {translations['Cost']}
            </label>
            <input
              type="number"
              id="driving-cost"
              value={cost}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="description" className="form-label">
              {translations['Description']}
            </label>
            <input
              ref={descriptionRef}
              type="text"
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setInvalidFields(invalidFields.filter(f => f !== 'description'));
              }}
              onFocus={(e) => {
                if (e.target.value === defaultDescriptionText) {
                  setDescription('');
                }
              }}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setDescription(defaultDescriptionText);
                }
              }}
              placeholder="T.ex Matlagningsmöte eller Ved"
              className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('description') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
              required
            />
          </div>
          <div>
            <label htmlFor="cost" className="form-label">
              {translations['Cost']}
            </label>
            <input
              ref={costRef}
              type="number"
              id="cost"
              value={cost}
              onChange={(e) => {
                setCost(e.target.value);
                setInvalidFields(invalidFields.filter(f => f !== 'cost'));
              }}
              className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('cost') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
              required
              step="0.01"
              min="0"
            />
          </div>
        </>
      )}
      <div>
        <label htmlFor="category" className="form-label">
          {translations['Category']}
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {translations[cat as keyof typeof translations] || cat}
            </option>
          ))}
          <option value="Övrigt">
            {translations['Övrigt' as keyof typeof translations] || 'Övrigt'}
          </option>
        </select>
        {category === 'Övrigt' && (
          <input
            ref={customCategoryRef}
            type="text"
            placeholder={translations['Enter category']}
            value={customCategory}
            onChange={(e) => {
              setCustomCategory(e.target.value);
              setInvalidFields(invalidFields.filter(f => f !== 'category'));
            }}
            className={`mt-2 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('category') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            required
          />
        )}
      </div>
      <div>
        <label htmlFor="image" className="form-label">
          {translations['Receipt Image']}
        </label>
        <input
          type="file"
          id="image-input"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleImageChange}
          className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-600 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition"
          required={!isDriving && !image && !(expense && expense.image)}
        />
        {imagePreview}
        {(image || existingImageUrl) && !isDriving && (
          <button
            type="button"
            onClick={analyzeReceipt}
            disabled={analyzeReceiptLoading}
            className="mt-2 w-full py-2 px-3 rounded-md bg-amber-600 dark:bg-amber-700 text-white hover:bg-amber-700 dark:hover:bg-amber-800 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm font-medium transition"
          >
            {analyzeReceiptLoading ? 'Analyserar kvitto...' : 'Analysera kvitto'}
          </button>
        )}
        {analyzeReceiptError && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">{analyzeReceiptError}</p>
        )}
      </div>
      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 inline-flex justify-center rounded-lg border border-indigo-700 bg-indigo-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-50 transition"
        >
          {isSubmitting
            ? (expense ? (translations['Saving...'] || 'Saving...') : translations['Adding...'])
            : (expense ? (translations['Save Changes'] || 'Save Changes') : translations['Add Expense'])}
        </button>
        {expense && onEditDone && (
          <button
            type="button"
            onClick={onEditDone}
            className="flex-1 inline-flex justify-center rounded-lg border border-gray-700 bg-gray-800 py-2 px-4 text-sm font-medium text-gray-200 shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 transition"
          >
            {translations['Cancel'] || 'Cancel'}
          </button>
        )}
      </div>
    </form>
  );
};

export default ExpenseForm;

