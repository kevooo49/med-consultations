import type { Backend } from "./backend";
import {
  listenConsultations,
  addConsultation,
  updateConsultation,
  removeConsultation,
  listenAvailabilityRules,
  addAvailabilityRule,
  removeAvailabilityRule,
  listenAbsences,
  addAbsence,
  removeAbsence,
} from "./firebaseService";

export const firebaseBackend: Backend = {
  listenConsultations,
  listenAvailability: listenAvailabilityRules,
  listenAbsences,

  addConsultation,
  updateConsultation,
  removeConsultation,

  addAvailability: addAvailabilityRule,
  removeAvailability: removeAvailabilityRule,

  addAbsence,
  removeAbsence,
};
