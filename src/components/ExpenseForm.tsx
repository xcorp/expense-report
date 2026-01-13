import React, { useState } from 'react';
import { db, Expense } from '../db';
import imageCompression from 'browser-image-compression';
import { translations } from '../i18n';
import { CATEGORIES, DRIVING_COST_MULTIPLIER } from '../config';

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
  }, [expense]);

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
    if (isDriving) {
      if (!purpose || !distanceKm || Number(distanceKm) <= 0) {
        try { (window as any).__USE_TOAST__?.push({ message: translations['Distance (km)'] + ' ' + translations['is required'], type: 'info' }); }
        catch { alert(translations['Distance (km)'] + ' ' + 'is required'); }
        setIsSubmitting(false);
        return;
      }
    }

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
    <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 dark:bg-gray-800 p-8 rounded-xl shadow-lg border-2 border-gray-300 dark:border-gray-700 max-w-md mx-auto text-gray-900 dark:text-gray-100">
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
              type="text"
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
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
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="distance" className="form-label">
              {translations['Distance (km)']}
            </label>
            <input
              type="number"
              id="distance"
              value={distanceKm}
              onChange={(e) => { setDistanceKm(e.target.value); setCost((Number(e.target.value) * DRIVING_COST_MULTIPLIER || 0).toFixed(2)); }}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
              step="0.1"
              min="0"
              required
            />
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
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="cost" className="form-label">
              {translations['Cost']}
            </label>
            <input
              type="number"
              id="cost"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
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
            type="text"
            placeholder={translations['Enter category']}
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="mt-2 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
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

