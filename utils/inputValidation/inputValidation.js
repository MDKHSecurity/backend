import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";

export async function validateInput(data, url) {
  try {
    const whitelist = /^[a-zA-Z0-9@? \[\]\{\},.]*$/;

    function validateValue(value) {
      if (typeof value === "string") {
        if (whitelist.test(value)) {
          return true;
        } else {
          logErrorToFile(`Invalid character(s) "${value}"`, url);
          return false;
        }
      } else if (Array.isArray(value)) {
        return value.every(validateValue);
      } else if (typeof value === "object" && value !== null) {
        return Object.values(value).every(validateValue);
      }
      return true; //True for numbers
    }

    const isValid = Object.entries(data).every(([key, value]) => validateValue(value));

    if (!isValid) {
      return false;
    }

    return true;
  } catch (error) {
    logErrorToFile(error, url);
    return false;
  }
}

