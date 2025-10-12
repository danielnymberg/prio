/**
 * Global validation rules for Syncfusion FormValidator
 *
 * Usage:
 * import { FormValidator } from '@syncfusion/ej2-inputs';
 * import { taskFormRules } from '@/utils/validation';
 *
 * const formValidator = new FormValidator('#taskForm', {
 *   rules: taskFormRules,
 *   customPlacement: (element, error) => {
 *     element.parentElement?.appendChild(error);
 *   }
 * });
 */

export const taskFormRules = {
  title: {
    required: [true, 'Titel krävs'],
    minLength: [3, 'Titel måste vara minst 3 tecken'],
    maxLength: [100, 'Titel får max vara 100 tecken'],
  },
  value_score: {
    required: [true, 'Värde krävs'],
    range: [1, 10, 'Värde måste vara 1-10'],
  },
  time_sensitivity: {
    required: [true, 'Tidskänslighet krävs'],
    range: [1, 10, 'Tidskänslighet måste vara 1-10'],
  },
  confidence: {
    required: [true, 'Tillit krävs'],
    range: [1, 10, 'Tillit måste vara 1-10'],
  },
  effort: {
    required: [true, 'Ansträngning krävs'],
    range: [1, 10, 'Ansträngning måste vara 1-10'],
  },
  deadline: {
    date: [true, 'Ogiltigt datum'],
  },
  estimated_duration: {
    min: [1, 'Varaktighet måste vara minst 1 minut'],
  },
};

export const projectFormRules = {
  name: {
    required: [true, 'Projektnamn krävs'],
    minLength: [3, 'Projektnamn måste vara minst 3 tecken'],
    maxLength: [100, 'Projektnamn får max vara 100 tecken'],
  },
  quoted_hours: {
    required: [true, 'Offererade timmar krävs'],
    min: [0, 'Offererade timmar måste vara minst 0'],
    max: [10000, 'Offererade timmar får max vara 10000'],
  },
  hourly_rate: {
    required: [true, 'Timpris krävs'],
    min: [0, 'Timpris måste vara minst 0 kr'],
    max: [100000, 'Timpris får max vara 100000 kr'],
  },
  external_costs: {
    min: [0, 'Externa kostnader måste vara minst 0 kr'],
  },
  completion_percentage: {
    range: [0, 100, 'Färdigställningsgrad måste vara 0-100%'],
  },
};

export const emailRules = {
  email: {
    required: [true, 'E-postadress krävs'],
    email: [true, 'Ogiltig e-postadress'],
  },
};

export const passwordRules = {
  password: {
    required: [true, 'Lösenord krävs'],
    minLength: [8, 'Lösenord måste vara minst 8 tecken'],
  },
};

/**
 * Custom validation function for CPM parameters
 * Ensures all CPM values are within acceptable ranges
 */
export function validateCPMParameters(
  value: number,
  timeSensitivity: number,
  confidence: number,
  effort: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (value < 1 || value > 10) {
    errors.push('Värde måste vara mellan 1 och 10');
  }
  if (timeSensitivity < 1 || timeSensitivity > 10) {
    errors.push('Tidskänslighet måste vara mellan 1 och 10');
  }
  if (confidence < 1 || confidence > 10) {
    errors.push('Tillit måste vara mellan 1 och 10');
  }
  if (effort < 1 || effort > 10) {
    errors.push('Ansträngning måste vara mellan 1 och 10');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Custom validation for deadline dates
 * Ensures deadline is not in the past (unless explicitly allowed)
 */
export function validateDeadline(
  deadline: string | Date,
  allowPast: boolean = false
): { valid: boolean; error?: string } {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();

  if (isNaN(deadlineDate.getTime())) {
    return { valid: false, error: 'Ogiltigt datum' };
  }

  if (!allowPast && deadlineDate < now) {
    return { valid: false, error: 'Deadline kan inte vara i det förflutna' };
  }

  return { valid: true };
}

/**
 * Custom validation for project budget
 * Ensures budget is realistic and within bounds
 */
export function validateProjectBudget(
  quotedHours: number,
  hourlyRate: number,
  externalCosts: number
): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  const totalBudget = quotedHours * hourlyRate + externalCosts;

  if (totalBudget < 0) {
    errors.push('Total budget kan inte vara negativ');
  }

  if (quotedHours > 1000) {
    warnings.push('Offererade timmar är mycket höga (>1000h). Kontrollera att detta är korrekt.');
  }

  if (hourlyRate < 100) {
    warnings.push('Timpris är mycket lågt (<100 kr). Kontrollera att detta är korrekt.');
  }

  if (hourlyRate > 5000) {
    warnings.push('Timpris är mycket högt (>5000 kr). Kontrollera att detta är korrekt.');
  }

  if (externalCosts > totalBudget * 0.5) {
    warnings.push('Externa kostnader är mer än 50% av total budget. Kontrollera att detta är korrekt.');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Validate email format (Swedish format support)
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Swedish phone number
 */
export function validateSwedishPhone(phone: string): boolean {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');

  // Check if it's a valid Swedish phone number
  // Supports: +46, 0046, or starting with 0
  const phoneRegex = /^(\+46|0046|0)[1-9]\d{7,9}$/;
  return phoneRegex.test(cleaned);
}
