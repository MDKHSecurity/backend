import { logErrorToFile } from "../logErrorToFile/logErrorToFile.js";

export function isPasswordValid(password, url) {
    try {
      if (typeof password !== "string") {
        return false;
      }
  
      if (password.length >= 12 && password.length <= 64) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
        logErrorToFile(error, url);
        return false;
    }
  }
  