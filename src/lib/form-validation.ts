import type { FocusEvent, FormEvent } from "react";

type RequiredControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isRequiredControl(target: EventTarget): target is RequiredControl {
  return target instanceof HTMLInputElement
    || target instanceof HTMLSelectElement
    || target instanceof HTMLTextAreaElement;
}

function labelFor(control: RequiredControl) {
  const ariaLabel = control.getAttribute("aria-label")?.replace(/\s+/g, " ").trim();
  const label = control.labels?.[0]?.textContent?.replace(/\s+/g, " ").trim();
  return label || ariaLabel || control.name.replace(/([A-Z])/g, " $1").replaceAll("_", " ").trim() || "this field";
}

function isMissingValue(control: RequiredControl) {
  return control instanceof HTMLInputElement && control.type === "file"
    ? !control.files?.length
    : !control.value.trim();
}

export function reportMissingRequiredField(event: FocusEvent<HTMLFormElement>) {
  const control = event.target;
  if (!isRequiredControl(control) || !control.required || control.disabled) return;

  if (isMissingValue(control)) {
    control.setAttribute("aria-invalid", "true");
    const label = control.closest("label");
    if (label && !label.querySelector(":scope > .required-field-error")) {
      const message = document.createElement("span");
      message.className = "required-field-error";
      message.setAttribute("role", "alert");
      message.textContent = `Complete ${labelFor(control).toLowerCase()}.`;
      label.append(message);
    }
  }
}

export function clearRequiredFieldError(event: FormEvent<HTMLFormElement>) {
  const control = event.target;
  if (isRequiredControl(control) && control.getAttribute("aria-invalid") === "true") {
    control.removeAttribute("aria-invalid");
    control.closest("label")?.querySelector(":scope > .required-field-error")?.remove();
  }
}

export function validateRequiredFields(form: HTMLFormElement) {
  const controls = Array.from(
    form.querySelectorAll<RequiredControl>("input[required], select[required], textarea[required]"),
  ).filter((control) => !control.disabled);
  const missing: string[] = [];
  const handledGroups = new Set<string>();

  for (const control of controls) {
    if (control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type)) {
      const groupKey = `${control.type}:${control.name}`;
      if (handledGroups.has(groupKey)) continue;
      handledGroups.add(groupKey);
      const group = controls.filter(
        (candidate) => candidate instanceof HTMLInputElement
          && candidate.type === control.type
          && candidate.name === control.name,
      ) as HTMLInputElement[];
      if (!group.some((item) => item.checked)) missing.push(labelFor(control));
      continue;
    }

    if (isMissingValue(control)) missing.push(labelFor(control));
  }

  if (missing.length) {
    const firstMissing = controls.find((control) => {
      if (control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type)) {
        return !controls.some((candidate) => candidate instanceof HTMLInputElement
          && candidate.type === control.type
          && candidate.name === control.name
          && candidate.checked);
      }
      return isMissingValue(control);
    });
    firstMissing?.focus();
    return `Complete required fields: ${[...new Set(missing)].join(", ")}.`;
  }

  return form.reportValidity() ? null : "Check the highlighted fields and try again.";
}
