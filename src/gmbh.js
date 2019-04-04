"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var version = "0.10.0";
var COREADDRESS = "localhost:49500";
var messages = require('./intrigue_pb');
var services = require('./intrigue_grpc_pb');
var grpc = require('grpc');
var gmbh = /** @class */ (function () {
    function gmbh(opts) {
        this.reg = new registration();
        this.opts = opts == undefined ? new options() : opts;
        this.con = new connection();
        this.registeredFunctions = {};
        this.pongTime = "";
        this.whoIs = {};
        this.state = "DISCONNECTED";
        this.msgCnt = 0;
        this.errors = [""];
        this.warnings = [""];
        this.env = process.env.ENV != undefined ? process.env.ENV : "";
        this.closed = false;
    }
    gmbh.prototype.start = function () {
        log("                    _                 ");
        log("  _  ._ _  |_  |_| /  | o  _  ._ _|_  ");
        log(" (_| | | | |_) | | \\_ | | (/_ | | |_ ");
        log("  _|                                  ");
        log("version=" + version + "; env=" + this.env);
        this.register();
    };
    gmbh.prototype.register = function () {
        log("attempting to connect to coreData");
        if (this.state == "CONNECTED") {
            log("state reported as connected; returning");
            return;
        }
        this.reg = this.getRegistration();
        console.log(this.reg);
    };
    gmbh.prototype.getRegistration = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, request, service;
            return __generator(this, function (_a) {
                client = new services.CabalClient(this.opts.standalone.coreAddress, grpc.credentials.createInsecure());
                request = new messages.NewServiceRequest();
                service = new messages.NewService();
                service.name = this.opts.service.name;
                service.aliases = this.opts.service.aliases;
                service.peerGroups = this.opts.service.peerGroups;
                service.isClient = true;
                service.isServer = true;
                request.NewService = service;
                request.Address = "";
                request.Env = "";
                client.registerService(request, function (err, resp) {
                    if (err != null) {
                        return null;
                    }
                    if (resp.getMessage() == "acknowledged") {
                        var serviceInfo = resp.getServiceinfo();
                        var r = new registration();
                        r.id = serviceInfo.getId();
                        r.address = serviceInfo.getAddress();
                        r.fingerprint = serviceInfo.getFingerprint();
                        return r;
                    }
                });
                return [2 /*return*/, null];
            });
        });
    };
    return gmbh;
}());
var registration = /** @class */ (function () {
    function registration() {
        this.id = "";
        this.mode = "";
        this.address = "";
        this.corePath = "";
        this.fingerprint = "";
    }
    return registration;
}());
var options = /** @class */ (function () {
    function options() {
        this.runtime = new runtimeOptions();
        this.standalone = new standaloneOptions();
        this.service = new serviceOptions();
    }
    return options;
}());
var runtimeOptions = /** @class */ (function () {
    function runtimeOptions() {
        this.blocking = true;
        this.verbose = true;
    }
    return runtimeOptions;
}());
var standaloneOptions = /** @class */ (function () {
    function standaloneOptions() {
        this.coreAddress = COREADDRESS;
    }
    return standaloneOptions;
}());
var serviceOptions = /** @class */ (function () {
    function serviceOptions() {
        this.name = "service";
        this.aliases = [""];
        this.peerGroups = ["universal"];
    }
    return serviceOptions;
}());
var connection = /** @class */ (function () {
    function connection() {
        this.address = "";
        this.connected = false;
        this.error = [""];
    }
    return connection;
}());
module.exports = {
    gmbh: gmbh,
    options: options,
    runtimeOptions: runtimeOptions,
    standaloneOptions: standaloneOptions,
    serviceOptions: serviceOptions,
};
function log(msg) {
    console.log(msg);
}
//     var client = new services.CabalClient('localhost:49500', grpc.credentials.createInsecure());
//     var request = new messages.Ping();
//     client.alive(request, (err: Object, resp: any) => {
//         if(err != null){
//             console.log("error", err);
//             return
//         }
//         console.log(resp.getStatus());
//         console.log(resp.getTime());
//         console.log(resp.getError());
//     });
