type RequiredControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function labelFor(control: RequiredControl) {
  const label = control.labels?.[0]?.textContent?.replace(/\s+/g, " ").trim();
  return label || control.name.replace(/([A-Z])/g, " $1").replaceAll("_", " ").trim() || "this field";
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
      const group = controls.filter((candidate) => candidate instanceof HTMLInputElement
        && candidate.type === control.type && candidate.name === control.name) as HTMLInputElement[];
      if (!group.some((item) => item.checked)) missing.push(labelFor(control));
      continue;
    }
    const isMissing = control instanceof HTMLInputElement && control.type === "file"
      ? !control.files?.length : !control.value.trim();
    if (isMissing) missing.push(labelFor(control));
  }

  if (missing.length) {
    const firstMissing = controls.find((control) => {
      if (control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type)) {
        return !controls.some((candidate) => candidate instanceof HTMLInputElement
          && candidate.type === control.type && candidate.name === control.name && candidate.checked);
      }
      return control instanceof HTMLInputElement && control.type === "file"
        ? !control.files?.length : !control.value.trim();
    });
    firstMissing?.focus();
    return `Complete required fields: ${[...new Set(missing)].join(", ")}.`;
  }

  return form.reportValidity() ? null : "Check the highlighted fields and try again.";
}
