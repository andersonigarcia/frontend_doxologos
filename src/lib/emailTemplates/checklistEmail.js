/**
 * Email template for Mental Health Checklist
 * Wrapper for EmailTemplates.checklistEmail method
 */

import emailTemplates from '../emailTemplates.js';

export const generateChecklistEmail = (name) => {
  return emailTemplates.checklistEmail(name);
};

export default generateChecklistEmail;
