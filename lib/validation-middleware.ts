import { supabaseClient } from './supabase-client';

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean | Promise<boolean>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: Record<string, string[]>;
}

export interface ValidationConfig {
  rules: ValidationRule[];
  stopOnFirstError: boolean;
  sanitizeInput: boolean;
}

export class ValidationMiddleware {
  private static instance: ValidationMiddleware;
  private configs: Map<string, ValidationConfig> = new Map();

  private constructor() {
    this.initializeDefaultConfigs();
  }

  public static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware();
    }
    return ValidationMiddleware.instance;
  }

  private initializeDefaultConfigs(): void {
    // User registration validation
    this.configs.set('userRegistration', {
      rules: [
        {
          field: 'email',
          type: 'required',
          message: 'Email is required'
        },
        {
          field: 'email',
          type: 'email',
          message: 'Invalid email format'
        },
        {
          field: 'password',
          type: 'required',
          message: 'Password is required'
        },
        {
          field: 'password',
          type: 'minLength',
          value: 8,
          message: 'Password must be at least 8 characters long'
        },
        {
          field: 'name',
          type: 'required',
          message: 'Name is required'
        },
        {
          field: 'name',
          type: 'minLength',
          value: 2,
          message: 'Name must be at least 2 characters long'
        }
      ],
      stopOnFirstError: false,
      sanitizeInput: true
    });

    // User login validation
    this.configs.set('userLogin', {
      rules: [
        {
          field: 'email',
          type: 'required',
          message: 'Email is required'
        },
        {
          field: 'email',
          type: 'email',
          message: 'Invalid email format'
        },
        {
          field: 'password',
          type: 'required',
          message: 'Password is required'
        }
      ],
      stopOnFirstError: false,
      sanitizeInput: true
    });

    // Project creation validation
    this.configs.set('projectCreation', {
      rules: [
        {
          field: 'name',
          type: 'required',
          message: 'Project name is required'
        },
        {
          field: 'name',
          type: 'minLength',
          value: 3,
          message: 'Project name must be at least 3 characters long'
        },
        {
          field: 'description',
          type: 'maxLength',
          value: 500,
          message: 'Project description must be less than 500 characters'
        }
      ],
      stopOnFirstError: false,
      sanitizeInput: true
    });

    // Team creation validation
    this.configs.set('teamCreation', {
      rules: [
        {
          field: 'name',
          type: 'required',
          message: 'Team name is required'
        },
        {
          field: 'name',
          type: 'minLength',
          value: 2,
          message: 'Team name must be at least 2 characters long'
        },
        {
          field: 'description',
          type: 'maxLength',
          value: 300,
          message: 'Team description must be less than 300 characters'
        }
      ],
      stopOnFirstError: false,
      sanitizeInput: true
    });
  }

  async validate(
    data: Record<string, any>,
    configName: string
  ): Promise<ValidationResult> {
    try {
      const config = this.configs.get(configName);
      if (!config) {
        throw new Error(`Validation config '${configName}' not found`);
      }

      const result: ValidationResult = {
        isValid: true,
        errors: [],
        fieldErrors: {}
      };

      // Sanitize input if configured
      const sanitizedData = config.sanitizeInput ? this.sanitizeInput(data) : data;

      for (const rule of config.rules) {
        const fieldValue = sanitizedData[rule.field];
        const fieldError = await this.validateField(fieldValue, rule);

        if (fieldError) {
          result.isValid = false;
          result.errors.push(fieldError);

          if (!result.fieldErrors[rule.field]) {
            result.fieldErrors[rule.field] = [];
          }
          result.fieldErrors[rule.field].push(fieldError);

          if (config.stopOnFirstError) {
            break;
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to system error'],
        fieldErrors: {}
      };
    }
  }

  private async validateField(value: any, rule: ValidationRule): Promise<string | null> {
    try {
      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            return rule.message;
          }
          break;

        case 'email':
          if (value && !this.isValidEmail(value)) {
            return rule.message;
          }
          break;

        case 'minLength':
          if (value && typeof value === 'string' && value.length < rule.value!) {
            return rule.message;
          }
          break;

        case 'maxLength':
          if (value && typeof value === 'string' && value.length > rule.value!) {
            return rule.message;
          }
          break;

        case 'pattern':
          if (value && rule.value && !rule.value.test(value)) {
            return rule.message;
          }
          break;

        case 'custom':
          if (rule.validator) {
            const isValid = await rule.validator(value);
            if (!isValid) {
              return rule.message;
            }
          }
          break;
      }

      return null;
    } catch (error) {
      console.error(`Error validating field ${rule.field}:`, error);
      return `Validation error for ${rule.field}`;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private sanitizeInput(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Remove HTML tags and trim whitespace
        sanitized[key] = value.replace(/<[^>]*>/g, '').trim();
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeInput(value);
      } else {
        // Keep other types as-is
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  async addValidationConfig(
    name: string,
    config: ValidationConfig
  ): Promise<void> {
    this.configs.set(name, config);
  }

  async getValidationConfig(name: string): Promise<ValidationConfig | undefined> {
    return this.configs.get(name);
  }

  async removeValidationConfig(name: string): Promise<boolean> {
    return this.configs.delete(name);
  }

  async validateUniqueField(
    table: string,
    field: string,
    value: any,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const filters: any = { [field]: value };
      
      if (excludeId) {
        filters.id = { neq: excludeId };
      }

      const response = await supabaseClient.get(table, {
        select: 'id',
        filters,
        limit: 1
      });

      if (response.error) {
        console.error('Error checking unique field:', response.error);
        return false;
      }

      return !response.data || response.data.length === 0;
    } catch (error) {
      console.error('Error validating unique field:', error);
      return false;
    }
  }

  async validateUserAccess(
    userEmail: string,
    resourceType: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      // Check if user exists and is active
      const userResponse = await supabaseClient.get('users', {
        select: 'id,is_active',
        filters: { email: userEmail }
      });

      if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
        return false;
      }

      const user = userResponse.data[0];
      if (!user.is_active) {
        return false;
      }

      // Check if user is admin
      const adminResponse = await supabaseClient.get('admin_users', {
        select: 'id',
        filters: { user_email: userEmail }
      });

      if (!adminResponse.error && adminResponse.data && adminResponse.data.length > 0) {
        return true; // Admin has access to everything
      }

      // Check resource-specific permissions
      if (resourceType && resourceId) {
        return await this.checkResourcePermission(userEmail, resourceType, resourceId);
      }

      return true;
    } catch (error) {
      console.error('Error validating user access:', error);
      return false;
    }
  }

  private async checkResourcePermission(
    userEmail: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    try {
      switch (resourceType) {
        case 'project':
          // Check if user is member of team assigned to project
          const projectResponse = await supabaseClient.get('team_project_assignments', {
            select: 'team_id,teams!inner(team_members!inner(user_email))',
            filters: { project_id: resourceId }
          });

          if (projectResponse.error) return false;

          return projectResponse.data?.some((assignment: any) =>
            assignment.teams?.team_members?.some((member: any) => member.user_email === userEmail)
          ) || false;

        case 'team':
          // Check if user is member of team
          const teamResponse = await supabaseClient.get('team_members', {
            select: 'id',
            filters: { team_id: resourceId, user_email: userEmail }
          });

          return !teamResponse.error && teamResponse.data && teamResponse.data.length > 0;

        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking resource permission:', error);
      return false;
    }
  }
}

// Global validation middleware instance
export const validationMiddleware = ValidationMiddleware.getInstance();

// Helper functions
export async function validateData(
  data: Record<string, any>,
  configName: string
): Promise<ValidationResult> {
  return await validationMiddleware.validate(data, configName);
}

export async function validateUniqueField(
  table: string,
  field: string,
  value: any,
  excludeId?: string
): Promise<boolean> {
  return await validationMiddleware.validateUniqueField(table, field, value, excludeId);
}

export async function validateUserAccess(
  userEmail: string,
  resourceType: string,
  resourceId?: string
): Promise<boolean> {
  return await validationMiddleware.validateUserAccess(userEmail, resourceType, resourceId);
}
