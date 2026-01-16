"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderStatus = exports.ReminderType = void 0;
var ReminderType;
(function (ReminderType) {
    ReminderType["TASK"] = "TASK";
    ReminderType["EVENT"] = "EVENT";
    ReminderType["CUSTOM"] = "CUSTOM";
})(ReminderType || (exports.ReminderType = ReminderType = {}));
var ReminderStatus;
(function (ReminderStatus) {
    ReminderStatus["PENDING"] = "PENDING";
    ReminderStatus["SENT"] = "SENT";
    ReminderStatus["DISMISSED"] = "DISMISSED";
    ReminderStatus["SNOOZED"] = "SNOOZED";
})(ReminderStatus || (exports.ReminderStatus = ReminderStatus = {}));
//# sourceMappingURL=reminder.types.js.map