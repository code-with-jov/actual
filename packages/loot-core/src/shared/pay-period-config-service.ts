// @ts-strict-ignore
import { type PayPeriodConfig } from './pay-periods';

// Static default config to avoid creating new objects
const DEFAULT_CONFIG: PayPeriodConfig = {
  enabled: false,
  payFrequency: 'monthly',
  startDate: '2025-01-01',
  payDayOfWeek: undefined,
  payDayOfMonth: undefined,
};

export interface PayPeriodConfigService {
  getConfig(): PayPeriodConfig | null;
  setConfig(config: PayPeriodConfig | null): void;
  subscribe(callback: (config: PayPeriodConfig | null) => void): () => void;
  isEnabled(): boolean;
  getEffectiveConfig(): PayPeriodConfig | null;
  getDefaultConfig(): PayPeriodConfig;
}

class PayPeriodConfigServiceImpl implements PayPeriodConfigService {
  private config: PayPeriodConfig | null = null;
  private subscribers: Set<(config: PayPeriodConfig | null) => void> = new Set();

  getConfig(): PayPeriodConfig | null {
    return this.config;
  }

  setConfig(config: PayPeriodConfig | null): void {
    // Validate config if provided
    if (config) {
        this.config = config;
    } else {
      this.config = null;
    }
    this.notifySubscribers();
  }

  subscribe(callback: (config: PayPeriodConfig | null) => void): () => void {
    this.subscribers.add(callback);
    
    // Call immediately with current config
    callback(this.config);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  isEnabled(): boolean {
    return this.config?.enabled === true;
  }

  getEffectiveConfig(): PayPeriodConfig | null {
    return this.config?.enabled ? this.config : null;
  }

  getDefaultConfig(): PayPeriodConfig {
    return DEFAULT_CONFIG;
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.error('Error in pay period config subscriber:', error);
      }
    });
  }
}

// Singleton instance
const payPeriodConfigService = new PayPeriodConfigServiceImpl();

export { payPeriodConfigService };
