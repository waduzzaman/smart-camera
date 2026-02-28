export const getNextSequenceNumber = (): number => {
  if (typeof window === "undefined") return 1;
  const lastNumber = localStorage.getItem("camera_last_sequence");
  const nextNumber = lastNumber ? parseInt(lastNumber, 10) + 1 : 1;
  return nextNumber;
};

export const updateSequenceNumber = (number: number) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("camera_last_sequence", number.toString());
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
