import { ExportFormatIcon } from "./ExportFormatIcon";

type FileImportControlProps = {
  accept: string;
  disabled: boolean;
  format: "csv" | "xlsx";
  label: string;
  onFile: (file: File) => void;
};

export function FileImportControl({ accept, disabled, format, label, onFile }: FileImportControlProps) {
  return <label className="file-example__upload ui-button ui-button--outline ui-button--default" data-disabled={disabled || undefined}>
    <ExportFormatIcon format={format} /><span>{label}</span>
    <input className="file-example__input" type="file" accept={accept} disabled={disabled} aria-label={label}
      onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (file) onFile(file);
      }} />
  </label>;
}
