class Bank {
    #clients;
    #genId; // Temp

    constructor() {
        this.#clients = [];
        this.#genId = 1; // Temp
    }

    addClient(client) {
        client.id = this.#genId; // Temp
        client.isActive = true;
        client.registrationDate = new Date();
        client.accounts = [];

        this.#clients.push(client);
        this.#genId++; // Temp

        return true;
    }

    createClientAccount(id, type, currency) {
        const client = this.findClientById(id);

        if (client === undefined) {
            return null;
        }

        const account = {
            type,
            number: this.#genId, // Temp
            balance: null,
            expiryDate: this.calcExpiryDateClientCard(1, 3),
            currency,
            isActive: true,
        };

        if (type === 'debit') {
            account.balance = 0;
        }

        if (type === 'credit') {
            account.creditLimit = 10000;
            account.balance = { own: 0, credit: account.creditLimit };
        }

        client.accounts.push(account);
        this.#genId++; // Temp

        return client;
    }

    makeClientAccountTransaction(id, number, type, amount, callback) {
        let client = this.findClientById(id);

        if (client === undefined) {
            return null;
        }

        let transactionResult = client.accounts.find(account => {
            if (account.number === number) {
                let result = null;
                // Пополнение или снятие средств с дебитового счета
                if (type === 'debit') {
                    let { balance } = account;

                    result = callback(balance, amount);

                    if (result < 0) {
                        return null;
                    }

                    account.balance = result;

                    return account;
                }
                // Пополнение или снятие средств с кредитного счета
                if (type === 'credit') {
                    let { credit } = account.balance;

                    result = callback(credit, amount);

                    if (result < 0) {
                        return null;
                    }

                    account.balance.credit = result;

                    let ownBalance =
                        account.balance.credit - account.creditLimit;

                    if (ownBalance <= 0) {
                        account.balance.own = 0;
                    } else {
                        account.balance.own = ownBalance;
                    }

                    return account;
                }
            }

            return null;
        });

        if (transactionResult === undefined) {
            return null;
        }

        return transactionResult;
    }

    findClientById(id) {
        return this.#clients.find(client => client.id === id);
    }

    calcExpiryDateClientCard(month, year) {
        const date = new Date();

        return `${date.getMonth() + month}/${date.getFullYear() + year}`;
    }

    conversionCurrencyToUsd(rates, type, amount) {
        let result = null;
        let baseCurrencyRate = rates.find(({ ccy }) => ccy === 'USD');

        if (type === 'UAH') {
            result = amount / baseCurrencyRate.sale;

            return Math.round(result * 100) / 100;
        }

        rates.forEach(({ ccy, buy }) => {
            if (type === ccy) {
                result = (amount * buy) / baseCurrencyRate.sale;

                return result;
            }
        });

        return Math.round(result * 100) / 100;
    }

    async calcAmountTotal() {
        const currencyRates = await this.getCurrencyRates();
        let result = 0;

        this.#clients.forEach(({ accounts }) => {
            accounts.forEach(account => {
                let { type, currency, balance } = account;

                if (type === 'debit') {
                    if (currency === 'USD') {
                        result += balance;

                        return account;
                    }

                    result += this.conversionCurrencyToUsd(
                        currencyRates,
                        currency,
                        balance,
                    );

                    return account;
                }

                if (account.type === 'credit') {
                    let { own, credit } = account.balance;
                    let totalAmount = own + credit;

                    if (currency === 'USD') {
                        result += totalAmount;

                        return account;
                    }

                    result += this.conversionCurrencyToUsd(
                        currencyRates,
                        currency,
                        totalAmount,
                    );

                    return account;
                }

                return null;
            });
        });

        return result;
    }

    async calcAmountClientsOwe(callback) {
        const currencyRates = await this.getCurrencyRates();
        let result = { amount: 0, numberDebtors: 0 };

        this.#clients.forEach(({ isActive, accounts }) => {
            if (!callback(isActive)) {
                return false;
            }

            const totalDebt = accounts.reduce((acc, accounut) => {
                let { type, currency } = accounut;

                if (type === 'credit') {
                    let loanAmount =
                        accounut.creditLimit - accounut.balance.credit;

                    if (loanAmount < 0) {
                        return acc;
                    }

                    if (currency === 'USD') {
                        acc += loanAmount;

                        return acc;
                    }

                    acc += this.conversionCurrencyToUsd(
                        currencyRates,
                        currency,
                        loanAmount,
                    );

                    return acc;
                }
            }, 0);

            if (totalDebt > 0) {
                result.numberDebtors++;
            }
            result.amount += totalDebt;
        });

        return result;
    }

    async getCurrencyRates() {
        const url =
            'https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5';

        try {
            const response = await fetch(url);
            const rates = await response.json();

            return rates;
        } catch (error) {
            return error;
        }
    }
}
