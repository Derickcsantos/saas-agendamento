// components/marketing/ImageUploader.tsx
import { Upload, X } from "lucide-react";
import { useState } from "react";

export default function ImageUploader({ images, onUpload, onRemove, maxFiles }) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      const remainingSlots = maxFiles - images.length;
      const filesToAdd = files.slice(0, remainingSlots);
      onUpload(filesToAdd);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      const remainingSlots = maxFiles - images.length;
      const filesToAdd = files.slice(0, remainingSlots);
      onUpload(filesToAdd);
    }
    
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Imagens para o Post (máx. {maxFiles})
        </label>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {images.length}/{maxFiles} selecionadas
        </span>
      </div>

      {/* Área de Upload */}
      <div
        className={`border-2 border-dashed rounded-2xl transition-all duration-200 ${
          dragOver 
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
            : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            <span className="font-medium text-purple-600 dark:text-purple-400">
              Clique para upload
            </span>{" "}
            ou arraste e solte
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            PNG, JPG, GIF até 5MB cada
          </p>
          
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              ref={el => fileInputRef.current = el}
            />
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition">
              <Upload className="w-4 h-4" />
              Selecionar Imagens
            </div>
          </label>
        </div>
      </div>

      {/* Preview das Imagens */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <button
                onClick={() => onRemove(index)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                <p className="text-xs text-white truncate">{image.name}</p>
                <p className="text-xs text-gray-300">
                  {(image.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}