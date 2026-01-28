/**
 * Money Value Object - DDD
 *
 * Representa um valor monetário de forma imutável
 */
export class Money {
    private readonly _amount: number;
    private readonly _currency: string;

    constructor(amount: number, currency: string = 'BRL') {
        if (amount < 0) {
            throw new Error('Amount cannot be negative');
        }
        if (!currency || currency.length !== 3) {
            throw new Error('Currency must be a valid 3-letter code');
        }

        this._amount = Math.round(amount * 100) / 100; // 2 decimal places
        this._currency = currency.toUpperCase();
    }

    get amount(): number {
        return this._amount;
    }

    get currency(): string {
        return this._currency;
    }

    // Operations
    add(other: Money): Money {
        this.ensureSameCurrency(other);
        return new Money(this._amount + other._amount, this._currency);
    }

    subtract(other: Money): Money {
        this.ensureSameCurrency(other);
        return new Money(this._amount - other._amount, this._currency);
    }

    multiply(factor: number): Money {
        return new Money(this._amount * factor, this._currency);
    }

    divide(divisor: number): Money {
        if (divisor === 0) {
            throw new Error('Cannot divide by zero');
        }
        return new Money(this._amount / divisor, this._currency);
    }

    // Comparisons
    equals(other: Money): boolean {
        return this._amount === other._amount && this._currency === other._currency;
    }

    isGreaterThan(other: Money): boolean {
        this.ensureSameCurrency(other);
        return this._amount > other._amount;
    }

    isLessThan(other: Money): boolean {
        this.ensureSameCurrency(other);
        return this._amount < other._amount;
    }

    isZero(): boolean {
        return this._amount === 0;
    }

    isPositive(): boolean {
        return this._amount > 0;
    }

    // Formatting
    toString(): string {
        return `${this._currency} ${this._amount.toFixed(2)}`;
    }

    toJSON() {
        return {
            amount: this._amount,
            currency: this._currency,
        };
    }

    // Private helpers
    private ensureSameCurrency(other: Money) {
        if (this._currency !== other._currency) {
            throw new Error(`Cannot operate on different currencies: ${this._currency} vs ${other._currency}`);
        }
    }

    // Factory methods
    static zero(currency: string = 'BRL'): Money {
        return new Money(0, currency);
    }

    static fromNumber(amount: number, currency: string = 'BRL'): Money {
        return new Money(amount, currency);
    }
}
