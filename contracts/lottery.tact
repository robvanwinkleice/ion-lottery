const DAY_SECONDS: Int = 86400;

fun nextDailyUnlock(ts: Int): Int {
    return ((ts / DAY_SECONDS) + 1) * DAY_SECONDS;
}

fun nextWeeklyUnlock(ts: Int): Int {
    let day = ts / DAY_SECONDS;
    let weekday = (day + 3) % 7;
    let daysUntilMonday = 7 - weekday;
    return (day + daysUntilMonday) * DAY_SECONDS;
}

message(0x4d79d001) SetDailyTicketPrice {
    price: Int as coins;
}

message(0x4d79d002) SetWeeklyTicketPrice {
    price: Int as coins;
}

contract Lottery {
    owner: Address;
    instantDraws: Bool;
    retainedFees: Int as coins;

    dailyTicketPrice: Int as coins;
    nextDailyTicketPrice: Int as coins;
    dailyRound: Int as uint32;
    dailyDrawUnlockAt: Int as uint32;
    dailyParticipantCount: Int as uint32;
    dailyPool: Int as coins;
    dailyParticipants: map<Int as uint32, Address>;
    dailyHasTicket: map<Address, Bool>;
    lastDailyWinner: Address?;
    lastDailyPrize: Int as coins;

    weeklyTicketPrice: Int as coins;
    nextWeeklyTicketPrice: Int as coins;
    weeklyRound: Int as uint32;
    weeklyDrawUnlockAt: Int as uint32;
    weeklyParticipantCount: Int as uint32;
    weeklyPool: Int as coins;
    weeklyParticipants: map<Int as uint32, Address>;
    weeklyHasTicket: map<Address, Bool>;
    lastWeeklyWinner: Address?;
    lastWeeklyPrize: Int as coins;

    init(owner: Address, instantDraws: Bool) {
        self.owner = owner;
        self.instantDraws = instantDraws;
        self.retainedFees = 0;

        self.dailyTicketPrice = ton("1000");
        self.nextDailyTicketPrice = ton("1000");
        self.dailyRound = 1;
        if (instantDraws) {
            self.dailyDrawUnlockAt = now();
        } else {
            self.dailyDrawUnlockAt = nextDailyUnlock(now());
        }
        self.dailyParticipantCount = 0;
        self.dailyPool = 0;
        self.dailyParticipants = emptyMap();
        self.dailyHasTicket = emptyMap();
        self.lastDailyWinner = null;
        self.lastDailyPrize = 0;

        self.weeklyTicketPrice = ton("5000");
        self.nextWeeklyTicketPrice = ton("5000");
        self.weeklyRound = 1;
        if (instantDraws) {
            self.weeklyDrawUnlockAt = now();
        } else {
            self.weeklyDrawUnlockAt = nextWeeklyUnlock(now());
        }
        self.weeklyParticipantCount = 0;
        self.weeklyPool = 0;
        self.weeklyParticipants = emptyMap();
        self.weeklyHasTicket = emptyMap();
        self.lastWeeklyWinner = null;
        self.lastWeeklyPrize = 0;
    }

    receive("Deploy") {}

    receive("BuyDailyTicket") {
        self.buyDailyTicket();
    }

    receive("BuyWeeklyTicket") {
        self.buyWeeklyTicket();
    }

    receive("DrawDaily") {
        self.drawDaily();
    }

    receive("DrawWeekly") {
        self.drawWeekly();
    }

    receive("WithdrawFees") {
        self.withdrawFees();
    }

    receive(msg: SetDailyTicketPrice) {
        self.requireOwner();
        require(msg.price > 0, "Invalid price");
        self.nextDailyTicketPrice = msg.price;
        if (self.dailyParticipantCount == 0) {
            self.dailyTicketPrice = msg.price;
        }
    }

    receive(msg: SetWeeklyTicketPrice) {
        self.requireOwner();
        require(msg.price > 0, "Invalid price");
        self.nextWeeklyTicketPrice = msg.price;
        if (self.weeklyParticipantCount == 0) {
            self.weeklyTicketPrice = msg.price;
        }
    }

    fun requireOwner() {
        require(sender() == self.owner, "Not owner");
    }

    fun buyDailyTicket() {
        let ctx = context();
        require(self.instantDraws || now() < self.dailyDrawUnlockAt, "Daily closed");
        require(ctx.value == self.dailyTicketPrice, "Invalid daily price");
        require(!self.dailyHasTicket.exists(ctx.sender), "Daily duplicate");

        self.dailyParticipants.set(self.dailyParticipantCount, ctx.sender);
        self.dailyHasTicket.set(ctx.sender, true);
        self.dailyParticipantCount = self.dailyParticipantCount + 1;
        self.dailyPool = self.dailyPool + self.dailyTicketPrice;
    }

    fun buyWeeklyTicket() {
        let ctx = context();
        require(self.instantDraws || now() < self.weeklyDrawUnlockAt, "Weekly closed");
        require(ctx.value == self.weeklyTicketPrice, "Invalid weekly price");
        require(!self.weeklyHasTicket.exists(ctx.sender), "Weekly duplicate");

        self.weeklyParticipants.set(self.weeklyParticipantCount, ctx.sender);
        self.weeklyHasTicket.set(ctx.sender, true);
        self.weeklyParticipantCount = self.weeklyParticipantCount + 1;
        self.weeklyPool = self.weeklyPool + self.weeklyTicketPrice;
    }

    fun drawDaily() {
        require(self.instantDraws || now() >= self.dailyDrawUnlockAt, "Daily not ready");

        if (self.dailyParticipantCount > 0) {
            let winnerIndex = random(0, self.dailyParticipantCount);
            let winner = self.dailyParticipants.get(winnerIndex)!!;
            let prize = (self.dailyPool * 80) / 100;
            let fee = self.dailyPool - prize;

            self.lastDailyWinner = winner;
            self.lastDailyPrize = prize;
            self.retainedFees = self.retainedFees + fee;

            message(MessageParameters {
                to: winner,
                value: prize,
                mode: SendPayFwdFeesSeparately,
                bounce: false,
            });
        } else {
            self.lastDailyWinner = null;
            self.lastDailyPrize = 0;
        }

        self.dailyRound = self.dailyRound + 1;
        if (self.instantDraws) {
            self.dailyDrawUnlockAt = now();
        } else {
            self.dailyDrawUnlockAt = nextDailyUnlock(now());
        }
        self.dailyParticipantCount = 0;
        self.dailyPool = 0;
        self.dailyParticipants = emptyMap();
        self.dailyHasTicket = emptyMap();
        self.dailyTicketPrice = self.nextDailyTicketPrice;
    }

    fun drawWeekly() {
        require(self.instantDraws || now() >= self.weeklyDrawUnlockAt, "Weekly not ready");

        if (self.weeklyParticipantCount > 0) {
            let winnerIndex = random(0, self.weeklyParticipantCount);
            let winner = self.weeklyParticipants.get(winnerIndex)!!;
            let prize = (self.weeklyPool * 80) / 100;
            let fee = self.weeklyPool - prize;

            self.lastWeeklyWinner = winner;
            self.lastWeeklyPrize = prize;
            self.retainedFees = self.retainedFees + fee;

            message(MessageParameters {
                to: winner,
                value: prize,
                mode: SendPayFwdFeesSeparately,
                bounce: false,
            });
        } else {
            self.lastWeeklyWinner = null;
            self.lastWeeklyPrize = 0;
        }

        self.weeklyRound = self.weeklyRound + 1;
        if (self.instantDraws) {
            self.weeklyDrawUnlockAt = now();
        } else {
            self.weeklyDrawUnlockAt = nextWeeklyUnlock(now());
        }
        self.weeklyParticipantCount = 0;
        self.weeklyPool = 0;
        self.weeklyParticipants = emptyMap();
        self.weeklyHasTicket = emptyMap();
        self.weeklyTicketPrice = self.nextWeeklyTicketPrice;
    }

    fun withdrawFees() {
        require(self.retainedFees > 0, "No fees");

        let amount = self.retainedFees;
        self.retainedFees = 0;

        message(MessageParameters {
            to: self.owner,
            value: amount,
            mode: SendPayFwdFeesSeparately,
            bounce: false,
        });
    }

    get fun getOwner(): Address {
        return self.owner;
    }

    get fun getInstantDraws(): Bool {
        return self.instantDraws;
    }

    get fun getRetainedFees(): Int {
        return self.retainedFees;
    }

    get fun getDailyTicketPrice(): Int {
        return self.dailyTicketPrice;
    }

    get fun getNextDailyTicketPrice(): Int {
        return self.nextDailyTicketPrice;
    }

    get fun getDailyRound(): Int {
        return self.dailyRound;
    }

    get fun getDailyDrawUnlockAt(): Int {
        return self.dailyDrawUnlockAt;
    }

    get fun getDailyParticipantCount(): Int {
        return self.dailyParticipantCount;
    }

    get fun getDailyPool(): Int {
        return self.dailyPool;
    }

    get fun getDailyParticipant(index: Int): Address? {
        return self.dailyParticipants.get(index);
    }

    get fun getDailyHasTicket(address: Address): Bool {
        return self.dailyHasTicket.exists(address);
    }

    get fun getLastDailyWinner(): Address? {
        return self.lastDailyWinner;
    }

    get fun getLastDailyPrize(): Int {
        return self.lastDailyPrize;
    }

    get fun getWeeklyTicketPrice(): Int {
        return self.weeklyTicketPrice;
    }

    get fun getNextWeeklyTicketPrice(): Int {
        return self.nextWeeklyTicketPrice;
    }

    get fun getWeeklyRound(): Int {
        return self.weeklyRound;
    }

    get fun getWeeklyDrawUnlockAt(): Int {
        return self.weeklyDrawUnlockAt;
    }

    get fun getWeeklyParticipantCount(): Int {
        return self.weeklyParticipantCount;
    }

    get fun getWeeklyPool(): Int {
        return self.weeklyPool;
    }

    get fun getWeeklyParticipant(index: Int): Address? {
        return self.weeklyParticipants.get(index);
    }

    get fun getWeeklyHasTicket(address: Address): Bool {
        return self.weeklyHasTicket.exists(address);
    }

    get fun getLastWeeklyWinner(): Address? {
        return self.lastWeeklyWinner;
    }

    get fun getLastWeeklyPrize(): Int {
        return self.lastWeeklyPrize;
    }
}
