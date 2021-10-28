class Bank {
    #clients;
    #clientId; // Temp

    constructor() {
        this.#clients = [];
        this.#clientId = 1; // Temp
    }

    addClient(client) {
        client.id = this.#clientId;
        client.isActive = true;
        client.registrationDate = new Date().toLocaleString();
        client.accounts = [];

        this.#clients.push(client);
        this.#clientId++; // Temp

        return true;
    }

    addClientAccount(id, type, currency) {
        const client = this.findClientById(id);

        if (client === undefined) {
            return null;
        }

        const account = {
            type,
            balance: null,
            expiryDate: this.calcExpiryDate(),
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

        return client;
    }

    calcMoneyTotal() {
        let result = 0;

        this.#clients.forEach(({ accounts }) => {
            accounts.forEach(account => {});
        });
    }

    transactionClientAccount(id, type, amount, currency, callback) {
        let client = this.findClientById(id);

        if (client === undefined) {
            return null;
        }

        let transactionResult = client.accounts.find(account => {
            if (account.currency === currency) {
                let result = null;
                // Операции по дебитовому счету
                if (type === 'debit') {
                    let { balance } = account;
                    result = callback(balance, amount);

                    if (result < 0) {
                        return null;
                    }

                    account.balance = result;

                    return account;
                }
                // Операции по кредитному счету
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

    calcExpiryDate() {
        const date = new Date();

        return `${date.getMonth() + 1}/${date.getFullYear() + 3}`;
    }
}

const pb = new Bank();

pb.addClient({ firstName: 'max', middleName: 'max', lastName: 'max' });
pb.addClient({ firstName: 'den', middleName: 'den', lastName: 'den' });
pb.addClient({ firstName: 'ivan', middleName: 'ivan', lastName: 'ivan' });

pb.addClientAccount(1, 'debit', 'uah');
pb.addClientAccount(1, 'debit', 'usd');
pb.addClientAccount(1, 'credit', 'rub');
// console.log(
//     pb.transactionClientAccount(
//         1,
//         'debit',
//         5000,
//         'usd',
//         (balance, amount) => balance + amount,
//     ),
// );
// pb.transactionClientAccount(
//     1,
//     'debit',
//     4999,
//     (balance, amount) => balance - amount,
// );
// pb.topUpClientAccount(1, 'credit', 2000);

// pb.addClientAccount(2, 'debit', 'USD');
// pb.addClientAccount(2, 'credit', 'USD');
// pb.topUpClientAccount(2, 'debit', 3000);
// pb.topUpClientAccount(2, 'credit', 4000);

// pb.addClientAccount(3, 'debit', 'EUR');
// pb.addClientAccount(3, 'credit', 'EUR');
// pb.topUpClientAccount(3, 'debit', 5000);
// pb.topUpClientAccount(3, 'credit', 6000);

// console.log(pb.topUpClientAccount(2, 'credit', 1000));

console.log(pb);
