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
        let account = null;

        if (client === undefined) {
            return null;
        }

        account = {
            type,
            number: this.#genId, // Temp
            balance: null,
            expiryDate: this.setExpiryDateClientCard(1, 3),
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

    findClientById(id) {
        return this.#clients.find(client => client.id === id);
    }

    setExpiryDateClientCard(month, year) {
        const date = new Date();

        return `${date.getMonth() + month}/${date.getFullYear() + year}`;
    }

    conversionCurrency(
        rates,
        currency,
        amount,
        baseCurrencyBank,
        baseCurrencyCountry,
    ) {
        let result = null;
        let baseCurrencyRate = rates.find(
            ({ ccy }) => ccy === baseCurrencyBank,
        );

        if (currency === baseCurrencyCountry) {
            result = amount / baseCurrencyRate.sale;

            return Math.round(result * 100) / 100;
        }

        rates.forEach(({ ccy, buy }) => {
            if (currency === ccy) {
                result = (amount * buy) / baseCurrencyRate.sale;

                return result;
            }
        });

        return Math.round(result * 100) / 100;
    }

    async getAmountTotal(baseCurrencyBank, baseCurrencyCountry) {
        const currencyRates = await this.getCurrencyRates();

        return this.#clients.reduce((result, { accounts }) => {
            accounts.forEach(account => {
                let { type, currency, balance } = account;

                if (type === 'debit') {
                    if (currency === baseCurrencyBank) {
                        result += balance;

                        return account;
                    }

                    result += this.conversionCurrency(
                        currencyRates,
                        currency,
                        balance,
                        baseCurrencyBank,
                        baseCurrencyCountry,
                    );

                    return account;
                }

                if (account.type === 'credit') {
                    let { own, credit } = account.balance;
                    let totalAmount = own + credit;

                    if (currency === baseCurrencyBank) {
                        result += totalAmount;

                        return account;
                    }

                    result += this.conversionCurrency(
                        currencyRates,
                        currency,
                        totalAmount,
                        baseCurrencyBank,
                        baseCurrencyCountry,
                    );

                    return account;
                }
            });

            return result;
        }, 0);
    }

    async getAmountClientsOwe(mainCurrencyBank, mainCurrencyCountry, callback) {
        const currencyRates = await this.getCurrencyRates();

        return this.#clients.reduce(
            (accumulator, { isActive, accounts }, index) => {
                if (index === 0) {
                    accumulator.amount = 0;
                    accumulator.numberDebtors = 0;
                }

                if (!callback(isActive)) {
                    return accumulator;
                }

                const totalDebt = accounts.reduce((acc, accounut) => {
                    let { type, currency } = accounut;

                    if (type === 'credit') {
                        let loanAmount =
                            accounut.creditLimit - accounut.balance.credit;

                        if (loanAmount < 0) {
                            return acc;
                        }

                        if (currency === mainCurrencyBank) {
                            acc += loanAmount;

                            return acc;
                        }

                        acc += this.conversionCurrencyToUsd(
                            currencyRates,
                            currency,
                            loanAmount,
                            mainCurrencyBank,
                            mainCurrencyCountry,
                        );

                        return acc;
                    }
                }, 0);

                if (totalDebt > 0) {
                    accumulator.numberDebtors++;
                }
                accumulator.amount += totalDebt;

                return accumulator;
            },
            {},
        );
    }

    async getCurrencyRates(handleError) {
        const url =
            'https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5';

        try {
            const response = await fetch(url);
            const rates = await response.json();

            return rates;
        } catch (error) {
            handleError(error);
        }
    }
}
