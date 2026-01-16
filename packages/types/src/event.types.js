"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRecurrence = exports.EventType = void 0;
var EventType;
(function (EventType) {
    EventType["MEETING"] = "MEETING";
    EventType["APPOINTMENT"] = "APPOINTMENT";
    EventType["REMINDER"] = "REMINDER";
    EventType["DEADLINE"] = "DEADLINE";
    EventType["PERSONAL"] = "PERSONAL";
    EventType["WORK"] = "WORK";
})(EventType || (exports.EventType = EventType = {}));
var EventRecurrence;
(function (EventRecurrence) {
    EventRecurrence["NONE"] = "NONE";
    EventRecurrence["DAILY"] = "DAILY";
    EventRecurrence["WEEKLY"] = "WEEKLY";
    EventRecurrence["MONTHLY"] = "MONTHLY";
    EventRecurrence["YEARLY"] = "YEARLY";
})(EventRecurrence || (exports.EventRecurrence = EventRecurrence = {}));
//# sourceMappingURL=event.types.js.map