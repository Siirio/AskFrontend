import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Trash2 } from "lucide-react";
import {
  CATALOG_IMAGE_LIMIT,
  acceptCatalogImageFiles,
  moveCatalogImage,
  type CatalogImageDraft,
} from "../../lib/catalogImages";

type CatalogImagePickerProps = {
  images: CatalogImageDraft[];
  onChange: (images: CatalogImageDraft[]) => void;
  label: string;
  hint: string;
};

function ImagePreview({ image }: { image: CatalogImageDraft }) {
  const previewUrl = useMemo(
    () => image.file ? URL.createObjectURL(image.file) : image.url,
    [image.file, image.url],
  );

  useEffect(() => () => {
    if (image.file && previewUrl) URL.revokeObjectURL(previewUrl);
  }, [image.file, previewUrl]);

  return previewUrl ? <img src={previewUrl} alt="" /> : null;
}

export function CatalogImagePicker({ images, onChange, label, hint }: CatalogImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addFiles = (files: Iterable<File>) => {
    const accepted = acceptCatalogImageFiles(images.length, files);
    if (accepted.length === 0) return;
    onChange([
      ...images,
      ...accepted.map(file => ({ key: `new:${crypto.randomUUID()}`, file })),
    ]);
  };

  return (
    <section
      className="catalog-image-picker"
      tabIndex={0}
      onPaste={event => {
        const files = Array.from(event.clipboardData.files);
        if (files.length > 0) {
          event.preventDefault();
          addFiles(files);
        }
      }}
      onDragOver={event => event.preventDefault()}
      onDrop={event => {
        event.preventDefault();
        if (draggedIndex !== null) {
          setDraggedIndex(null);
          return;
        }
        addFiles(event.dataTransfer.files);
      }}
    >
      <div className="catalog-image-picker__heading">
        <div>
          <strong>{label}</strong>
          <span>{hint}</span>
        </div>
        <span>{images.length}/{CATALOG_IMAGE_LIMIT}</span>
      </div>

      {images.length > 0 && (
        <div className="catalog-image-picker__list">
          {images.map((image, index) => (
            <article
              key={image.key}
              className="catalog-image-picker__item"
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                event.stopPropagation();
                if (draggedIndex === null) return;
                onChange(moveCatalogImage(images, draggedIndex, index));
                setDraggedIndex(null);
              }}
            >
              <ImagePreview image={image} />
              {index === 0 && <b>Главное</b>}
              <div className="catalog-image-picker__controls">
                <GripVertical size={15} aria-hidden="true" />
                <button type="button" disabled={index === 0} onClick={() => onChange(moveCatalogImage(images, index, index - 1))} aria-label="Переместить изображение влево">
                  <ChevronLeft size={14} />
                </button>
                <button type="button" disabled={index === images.length - 1} onClick={() => onChange(moveCatalogImage(images, index, index + 1))} aria-label="Переместить изображение вправо">
                  <ChevronRight size={14} />
                </button>
                <button type="button" onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index))} aria-label="Удалить изображение">
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {images.length < CATALOG_IMAGE_LIMIT && (
        <button type="button" className="catalog-image-picker__add" onClick={() => inputRef.current?.click()}>
          <ImagePlus size={20} />
          <span>Выбрать, перетащить или вставить</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept="image/png,image/jpeg,image/webp"
        onChange={event => {
          if (event.target.files) addFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </section>
  );
}
