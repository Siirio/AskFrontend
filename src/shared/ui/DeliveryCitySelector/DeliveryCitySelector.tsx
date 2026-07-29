import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CitySelector } from "../CitySelector/CitySelector";

type DeliveryCitySelectorProps = {
  values: string[];
  onChange: (values: string[]) => void;
};

export function DeliveryCitySelector({ values, onChange }: DeliveryCitySelectorProps) {
  const { t } = useTranslation();

  const addCity = (city: string) => {
    if (!values.includes(city)) {
      onChange([...values, city]);
    }
  };

  return (
    <div className="delivery-city-selector">
      <CitySelector
        value={t("seller.deliveryCities.add")}
        onChange={addCity}
        buttonClassName="delivery-city-selector__trigger"
      />
      {values.length > 0 && (
        <div className="delivery-city-selector__values">
          {values.map(city => (
            <span key={city}>
              {city}
              <button
                type="button"
                onClick={() => onChange(values.filter(value => value !== city))}
                aria-label={t("seller.deliveryCities.remove", { city })}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
