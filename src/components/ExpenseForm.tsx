import React, { useState } from 'react';
import { db } from '../db';
import imageCompression from 'browser-image-compression';
// heic2any converts HEIC/HEIF images to web-friendly formats (JPEG/PNG)
// we import dynamically to avoid bundling when not needed
import { translations } from '../i18n';

const CATEGORIES = ['Food', 'Travel', 'Supplies', 'Marketing', 'Other'];

const ExpenseForm: React.FC = () => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  // Driving-specific fields
  const [isDriving, setIsDriving] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [passengers, setPassengers] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  // cost is kept as string for the non-driving flow; for driving cost is computed
  const [cost, setCost] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];

      // If the file is HEIC/HEIF, try to convert it to JPEG using heic2any
      const isHeic = /heic|heif/i.test(file.type) || /\.heic$/i.test(file.name);
      if (isHeic) {
        import('heic2any')
          .then((heic2any) => (heic2any && (heic2any as any).default) ? (heic2any as any).default({ blob: file, toType: 'image/jpeg' }) : (heic2any as any)({ blob: file, toType: 'image/jpeg' }))
          .then((convertedBlob: Blob) => {
            // Convert blob to File so downstream code works the same
            const jpegFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
            setImage(jpegFile);
          })
          .catch((err) => {
            console.error('HEIC conversion failed:', err);
            // use toast if available, else fallback to alert
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
    // Validation
    if (isDriving) {
      if (!purpose || !distanceKm || Number(distanceKm) <= 0) {
        try { (window as any).__USE_TOAST__?.push({ message: translations['Distance (km)'] + ' ' + translations['is required'], type: 'info' }); }
        catch { alert(translations['Distance (km)'] + ' ' + 'is required'); }
        return;
      }
    } else {
      if (!description || !image || !cost) {
        try { (window as any).__USE_TOAST__?.push({ message: translations['Description, cost, and image are required'], type: 'info' }); }
        catch { alert(translations['Description, cost, and image are required']); }
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };

      let imageBuffer: ArrayBuffer | undefined = undefined;
      let imageType: string | undefined = undefined;
      if (image) {
        if (image.type === 'application/pdf') {
          imageBuffer = await image.arrayBuffer();
          imageType = image.type;
        } else {
          const compressedImage = await imageCompression(image as File, options);
          imageBuffer = await compressedImage.arrayBuffer();
          imageType = compressedImage.type || image.type || undefined;
        }
      } else {
        // no image provided (allowed for driving expenses)
        imageBuffer = new ArrayBuffer(0);
        imageType = undefined;
      }

      const finalCategory = category === 'Other' ? customCategory : category;

      const expenseToAdd: any = {
        category: finalCategory,
        image: imageBuffer,
        imageType,
        createdAt: new Date(),
      };

      if (isDriving) {
        // For driving expenses the form shows purpose + distance; description is set to purpose
        expenseToAdd.description = purpose;
        expenseToAdd.purpose = purpose;
        expenseToAdd.passengers = passengers;
        expenseToAdd.distanceKm = Number(distanceKm);
        expenseToAdd.cost = Number(distanceKm) * 2.5;
      } else {
        expenseToAdd.description = description;
        expenseToAdd.cost = parseFloat(cost);
      }

      await db.expenses.add(expenseToAdd);

      setDescription('');
      setCategory(CATEGORIES[0]);
      setCustomCategory('');
      setPurpose('');
      setPassengers('');
      setDistanceKm('');
      setCost('');
      setIsDriving(false);
      setImage(null);
      // Clear the file input
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center space-x-4">
        <label className="inline-flex items-center">
          <input type="checkbox" checked={isDriving} onChange={(e) => setIsDriving(e.target.checked)} className="mr-2" />
          <span className="text-sm">{translations['Driving']}</span>
        </label>
      </div>

      {isDriving ? (
        <>
          <div>
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
              {translations['Purpose of trip']}
            </label>
            <input
              type="text"
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="distance" className="block text-sm font-medium text-gray-700">
              {translations['Distance (km)']}
            </label>
            <input
              type="number"
              id="distance"
              value={distanceKm}
              onChange={(e) => { setDistanceKm(e.target.value); setCost((Number(e.target.value) * 2.5 || 0).toFixed(2)); }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              step="0.1"
              min="0"
              required
            />
          </div>
          <div>
            <label htmlFor="passengers" className="block text-sm font-medium text-gray-700">
              {translations['Passengers']}
            </label>
            <input
              type="text"
              id="passengers"
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="driving-cost" className="block text-sm font-medium text-gray-700">
              {translations['Cost']}
            </label>
            <input
              type="text"
              id="driving-cost"
              value={cost}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm"
            />
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            {translations['Description']}
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
      )}
      <div>
        <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
          {translations['Cost']}
        </label>
        <input
          type="number"
          id="cost"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
          step="0.01"
        />
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          {translations['Category']}
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {translations[cat as keyof typeof translations] || cat}
            </option>
          ))}
        </select>
        {category === 'Other' && (
          <input
            type="text"
            placeholder={translations['Enter category']}
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        )}
      </div>
      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-700">
          {translations['Receipt Image']}
        </label>
        <input
          type="file"
          id="image-input"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleImageChange}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
          required={!isDriving}
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? translations['Adding...'] : translations['Add Expense']}
      </button>
    </form>
  );
};

export default ExpenseForm;
