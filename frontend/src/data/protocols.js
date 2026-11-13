// Emergency protocols are bundled with the app so they work with no backend.
// Add a protocol by adding its JSON file to content/protocols and listing it here.
import allergicReaction from '@content/protocols/allergic_reaction.json';
import breathingDifficulty from '@content/protocols/breathing_difficulty.json';
import burnInjury from '@content/protocols/burn_injury.json';
import chestPain from '@content/protocols/chest_pain.json';
import decompression from '@content/protocols/decompression.json';
import eyeInjury from '@content/protocols/eye_injury.json';
import lossOfConsciousness from '@content/protocols/loss_of_consciousness.json';
import psychologicalCrisis from '@content/protocols/psychological_crisis.json';
import radiationExposure from '@content/protocols/radiation_exposure.json';
import severeBleeding from '@content/protocols/severe_bleeding.json';
import strokeLikeSymptoms from '@content/protocols/stroke_like_symptoms.json';

export const PROTOCOLS = [
  chestPain,
  breathingDifficulty,
  strokeLikeSymptoms,
  lossOfConsciousness,
  severeBleeding,
  burnInjury,
  eyeInjury,
  radiationExposure,
  decompression,
  allergicReaction,
  psychologicalCrisis,
];
