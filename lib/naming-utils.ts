export const getNextSequenceNumber = (): number => {
  if (typeof window === "undefined") return 1;

  const lastNumber = localStorage.getItem("camera_last_sequence");

  if (!lastNumber) return 1;

  return parseInt(lastNumber, 10) + 1;
};

export const updateSequenceNumber = (usedNumber: number) => {
  if (typeof window === "undefined") return;

  // Store the LAST USED number
  localStorage.setItem("camera_last_sequence", usedNumber.toString());
};

export const generateFileName = (
  useCustomPrefix: boolean,
  customPrefix: string,
  sequenceNumber: number
): string => {
  if (useCustomPrefix && customPrefix.trim() !== "") {
    return `${customPrefix.trim()}_${sequenceNumber}.jpg`;
  }

  return `${sequenceNumber}.jpg`;
};