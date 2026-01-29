/**
 * Index des services de matching intelligent
 * Services critiques pour l'agent Thomas
 */

// Imports pour utilisation dans factory
import { PlotMatchingService } from './PlotMatchingService';
import { MaterialMatchingService } from './MaterialMatchingService';
import { ConversionMatchingService } from './ConversionMatchingService';
import { PhytosanitaryMatchingService } from './PhytosanitaryMatchingService';

// Exports
export { PlotMatchingService } from './PlotMatchingService';
export { MaterialMatchingService } from './MaterialMatchingService';
export { ConversionMatchingService } from './ConversionMatchingService';
export { PhytosanitaryMatchingService } from './PhytosanitaryMatchingService';

// Factory pour initialiser tous les services de matching
export class MatchingServicesFactory {
  /**
   * Création de tous les services de matching
   */
  static createServices(supabaseClient: any): MatchingServices {
    console.log('🎯 Creating matching services...');
    
    const services = {
      plotMatching: new PlotMatchingService(supabaseClient),
      materialMatching: new MaterialMatchingService(supabaseClient), 
      conversionMatching: new ConversionMatchingService(supabaseClient),
      phytosanitaryMatching: new PhytosanitaryMatchingService(supabaseClient)
    };
    
    console.log('✅ Matching services created');
    return services;
  }

  /**
   * Validation des services de matching
   */
  static async validateServices(services: MatchingServices): Promise<ValidationReport> {
    const report: ValidationReport = {
      services_valid: true,
      errors: []
    };

    try {
      // Tester chaque service
      const plotStats = services.plotMatching.getMatchingStats();
      const materialStats = services.materialMatching.getMatchingStats();
      // Pas de getStats sur ConversionMatchingService, skip pour l'instant

      console.log('🔍 Matching services validation completed');
      
    } catch (error) {
      report.services_valid = false;
      report.errors.push(`Validation error: ${error.message}`);
    }

    return report;
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface MatchingServices {
  plotMatching: any; // PlotMatchingService
  materialMatching: any; // MaterialMatchingService  
  conversionMatching: any; // ConversionMatchingService
  phytosanitaryMatching: any; // PhytosanitaryMatchingService
}

interface ValidationReport {
  services_valid: boolean;
  errors: string[];
}
