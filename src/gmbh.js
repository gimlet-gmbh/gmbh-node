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
var version = "0.10.0";
var COREADDRESS = "localhost:49500";
var messages = require('./intrigue_pb');
var services = require('./intrigue_grpc_pb');
var grpc = require('grpc');
var logger = require('node-color-log');
var client;
// @ts-ignore
var name;
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
        client = this;
    }
    gmbh.prototype.Start = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            log("                    _                 ");
            log("  _  ._ _  |_  |_| /  | o  _  ._ _|_  ");
            log(" (_| | | | |_) | | \\_ | | (/_ | | |_ ");
            log("  _|                                  ");
            log("version=" + version + "; env=" + _this.env);
            // @ts-ignore
            name = _this.opts.service.name;
            _this._connect();
            if (_this.env == "M") {
                log("managed mode; ignoring sigint; listening for sigusr2");
                process.on('SIGINT', function () { });
                process.on('SIGUSR2', gmbh._shutdown);
            }
            else {
                process.on('SIGINT', gmbh._shutdown);
            }
            resolve(true);
        });
    };
    gmbh.prototype.Route = function (route, handler) {
        this.registeredFunctions[route] = handler;
    };
    gmbh.prototype.MakeRequest = function (target, method, data) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this._dataRequest(target, method, data)
                            .then(function (responder) {
                            resolve(payload.fromProto(responder.getPload()));
                        }).catch(function (err) {
                            reject(new payload());
                        });
                    })];
            });
        });
    };
    gmbh.prototype.NewPayload = function () {
        return new payload();
    };
    gmbh.prototype._dataRequest = function (target, method, data) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var g = getClient();
                        if (g == null) {
                            reject("refError");
                            return;
                        }
                        g._resolveAddress(target)
                            .then(function (value) {
                            var t = Date.now();
                            var client = new services.CabalClient(_this.opts.standalone.coreAddress, grpc.credentials.createInsecure());
                            var msg = new messages.DataRequest();
                            var tport = new messages.Transport();
                            tport.setTarget(target);
                            tport.setMethod(method);
                            tport.setSender(_this.opts.service.name);
                            var request = new messages.Request();
                            request.setTport(tport);
                            request.setPload(data.toProto());
                            msg.setRequest(request);
                            _this.msgCnt++;
                            if (_this.env != "C" || process.env.LOGGING == "1") {
                                log("<=" + _this.msgCnt + "= target: " + target + ", method: " + method);
                            }
                            client.data(msg, function (err, reply) {
                                if (err != null) {
                                    console.log(err);
                                    reject("core.error" + err);
                                    return new payload();
                                }
                                if (_this.env != "C" || process.env.LOGGING == "1") {
                                    var tn = new Date();
                                    tn = tn - t;
                                    log(" =" + _this.msgCnt + "=> " + "time=" + tn);
                                }
                                if (reply.getResponder() == null) {
                                    log("error");
                                    console.log(reply);
                                    reject("getResponder.error");
                                    return;
                                }
                                resolve(reply.getResponder());
                            });
                        });
                    })];
            });
        });
    };
    gmbh.prototype._resolveAddress = function (target) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.whoIs[target] != undefined) {
                resolve(_this.whoIs[target]);
            }
            log("getting address for " + target);
            if (_this.reg == null) {
                reject("refError");
                return;
            }
            request.whoIs(target, _this.opts.service.name, _this.reg.fingerprint, _this.opts.standalone.coreAddress)
                .then(function (value) {
                // go directly to the taget service
                resolve(value);
            }).catch(function (err) {
                // go through the core
                resolve(_this.opts.standalone.coreAddress);
            });
        });
    };
    gmbh.prototype._connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        log("attempting to connect to coreData");
                        if (this.state == "CONNECTED") {
                            log("state reported as connected; returning");
                            return [2 /*return*/];
                        }
                        _a = this;
                        return [4 /*yield*/, this._register()];
                    case 1:
                        _a.reg = _b.sent();
                        log("registration details");
                        log("id=" + this.reg.id + "; address=" + this.reg.address + "; fingerprint=" + this.reg.fingerprint);
                        if (this.reg.address == "") {
                            log("address not received");
                            return [2 /*return*/];
                        }
                        this.con.address = this.reg.address;
                        this.state = "CONNECTED";
                        return [4 /*yield*/, this.con.connect()];
                    case 2:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    gmbh.prototype._register = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var send = function () {
                var client = new services.CabalClient(_this.opts.standalone.coreAddress, grpc.credentials.createInsecure());
                var request = new messages.NewServiceRequest();
                var service = new messages.NewService();
                service.setName(_this.opts.service.name);
                service.setAliasesList(_this.opts.service.aliases);
                service.setPeergroupsList(_this.opts.service.peerGroups);
                service.setIsclient(true);
                service.setIsserver(true);
                request.setService(service);
                request.setAddress("");
                request.setEnv(_this.env);
                client.registerService(request, function (err, resp) {
                    if (err == null) {
                        if (resp.getMessage() == "acknowledged") {
                            var serviceInfo = resp.getServiceinfo();
                            var r = new registration();
                            r.id = serviceInfo.getId();
                            r.address = serviceInfo.getAddress();
                            r.fingerprint = serviceInfo.getFingerprint();
                            resolve(r);
                        }
                    }
                    else {
                        // TODO
                        // if(this.closed || ()){}
                        log("could not reach gmbh-core, trying again in 5 seconds");
                        setTimeout(send, 5000);
                    }
                });
            };
            send();
        });
    };
    gmbh.prototype._unregister = function (addr, name) {
        return new Promise(function (resolve, reject) {
            var client = new services.CabalClient(addr, grpc.credentials.createInsecure());
            var request = new messages.ServiceUpdate();
            request.setRequest("shutdown.notif");
            request.setMessage(name);
            client.updateRegistration(request, function (err, resp) {
                resolve(true);
            });
        });
    };
    gmbh._shutdown = function () {
        var g = getClient();
        if (g == null) {
            log("refError");
            return;
        }
        console.log(); // deadline to align output
        g.closed = true;
        g._unregister(g.opts.standalone.coreAddress, g.opts.service.name).then(function () {
            if (g != null) {
                g.con.disconnect();
            }
            log("shutdown complete");
            process.exit(0);
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
        this.name = "";
        this.aliases = [""];
        this.peerGroups = ["universal"];
    }
    return serviceOptions;
}());
var connection = /** @class */ (function () {
    function connection() {
        this.address = "";
        this.server = new grpc.Server();
        this.connected = false;
        this.error = [""];
    }
    connection.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (_this.address == "") {
                            reject("connection.connect.noAddress");
                        }
                        _this.server.addService(services.CabalService, {
                            registerService: cabal.RegisterService,
                            updateRegistration: cabal.UpdateRegistration,
                            data: cabal.Data,
                            summary: cabal.Summary,
                            whoIs: cabal.WhoIs,
                            alive: cabal.Alive,
                        });
                        _this.server.bind(_this.address, grpc.ServerCredentials.createInsecure());
                        _this.server.start();
                        resolve("CONNECTED");
                    })];
            });
        });
    };
    connection.prototype.disconnect = function () { };
    return connection;
}());
/*
 * cabal
 *
 * Represents all static functions needed to run the cabal rpc server
 */
var cabal = /** @class */ (function () {
    function cabal() {
    }
    // RegisterService; not supported in client
    cabal.RegisterService = function (call, callback) {
        log("register service");
        var msg = new messages.Receipt();
        msg.setMessage("operation.invalid");
        callback(null, msg);
    };
    // UpdateRegistration; for notif of core shutdown
    cabal.UpdateRegistration = function (call, callback) {
        log("-> Update Registration");
        var request = call.request.getRequest();
        if (request == "core.shutdown") {
            log("received shutdown");
            var g_1 = getClient();
            if (g_1 != null) {
                g_1.con.server.tryShutdown(function () {
                    if (g_1 != null) {
                        g_1.con.server = new grpc.Server();
                        g_1.state = "DISCONNECTED";
                        g_1._connect();
                    }
                    else {
                        log("error; cannot get reference to client");
                    }
                });
            }
            var resp_1 = new messages.Receipt();
            resp_1.setMessage("ack");
            callback(null, resp_1);
            return;
        }
        var resp = new messages.Receipt();
        resp.setError("unknown.request");
        callback(null, resp);
    };
    cabal.Data = function (call, callback) {
        var g = getClient();
        if (g == null) {
            var err = new messages.DataResponse();
            err.setError("core.referr");
            callback(null, err);
            return;
        }
        g.msgCnt++;
        var request = call.request.getRequest();
        var tport = request.getTport();
        log("==" + g.msgCnt + "==> from=" + tport.getSender() + "; method=" + tport.getMethod());
        var value = handleDataRequest(tport, request.getPload());
        if (value == null) {
            log("issues");
            var msg_1 = new messages.DataResponse();
            msg_1.setError("handle.request.failed");
            callback(null, msg_1);
            return;
        }
        var result = new messages.Responder();
        result.setPload(value);
        var msg = new messages.DataResponse();
        msg.setResponder(result);
        callback(null, msg);
    };
    cabal.Summary = function (call, callback) {
        log("-> Summary Request");
        var fp = call.metadata.get("fingerprint");
        var unknownIDErr = function (msg) {
            if (msg === void 0) { msg = ""; }
            var err = new messages.SummaryReceipt();
            err.setError("unknown.id." + msg);
            callback(null, err);
        };
        var g = getClient();
        if (g == null) {
            unknownIDErr("client.referr");
            return;
        }
        if (g.reg == null) {
            unknownIDErr("reg.referr");
            return;
        }
        if (fp != g.reg.fingerprint) {
            log("could not match fingerprint," + g.reg.fingerprint + ", " + fp);
            unknownIDErr();
            return;
        }
        var response = new messages.SummaryReceipt();
        var service = new messages.CoreService();
        service.setName(g.opts.service.name);
        service.setAddress(g.reg.address);
        service.setMode(g.env);
        service.setPeergroupsList(g.opts.service.peerGroups);
        service.setErrorsList([""]);
        response.setServicesList([service]);
        callback(null, response);
    };
    // WhoIs; only core should distribute this information
    cabal.WhoIs = function (call, callback) {
        var msg = new messages.WhoIsRequest();
        msg.setError("operation.invalid");
        callback(null, msg);
    };
    // Alive; send the time back
    cabal.Alive = function (call, callback) {
        var msg = new messages.Pong();
        msg.setTime(new Date());
        callback(null, msg);
    };
    return cabal;
}());
/*
 * request
 *
 * Contains all static functions needed to make requests to core
 */
var request = /** @class */ (function () {
    function request() {
    }
    request.whoIs = function (target, name, fingerprint, address) {
        return new Promise(function (resolve, reject) {
            var client = new services.CabalClient(address, grpc.credentials.createInsecure());
            var request = new messages.WhoIsRequest();
            request.setTarget(target);
            request.setSender(name);
            var meta = new grpc.Metadata();
            meta.add("sender", name);
            meta.add("target", "core");
            meta.add("fingerprint", fingerprint);
            client.WhoIs(request, meta, function (err, reply) {
                if (err != null) {
                    reject("");
                }
                var e = reply.getError();
                if (e != "") {
                    reject(e);
                }
                resolve(reply.getTargetaddress());
            });
        });
    };
    request.Data = function () { };
    request.Register = function () { };
    return request;
}());
// handleDataRequest attempts to resolve the registered function with the client to send the 
// payload to for processing.
function handleDataRequest(tport, pload) {
    var g = getClient();
    if (g == null) {
        return null;
    }
    if (g.registeredFunctions[tport.getMethod()] == undefined) {
        log("undefined method");
        return null;
    }
    var obj = g.registeredFunctions[tport.getMethod()](tport.getSender(), payload.fromProto(pload));
    var rpcPayload = obj.toProto();
    return rpcPayload;
}
// getClient
// used to keep track of the global client data for use with the static cabal class
function getClient() {
    return client == undefined ? null : client;
}
// log messages in a standardized way
function log(msg) {
    var tag = name == undefined ? "gmbh" : name;
    logger.color('magenta').log("[" + timeStamp() + "] [" + tag + "] " + msg);
}
function timeStamp() {
    var d = new Date();
    return d.getFullYear() + "/" + d.getMonth() + "/" + d.getDay() + " " + d.getHours() + ":" + d.getMinutes();
}
var payload = /** @class */ (function () {
    function payload() {
        this.fieldsMap = [];
        this.jsonMap = [];
        this.textfieldsMap = [];
        this.boolfieldsMap = [];
        this.bytefieldsMap = [];
        this.intfieldsMap = [];
        this.int64fieldsMap = [];
        this.uintfieldsMap = [];
        this.uint64fieldsMap = [];
        this.doublefieldsMap = [];
        this.floatfieldsMap = [];
        this.proto = null;
    }
    payload.fromProto = function (pload) {
        var obj = pload.toObject();
        var r = new payload();
        r.fieldsMap = obj['fieldsMap'];
        r.jsonMap = obj['jsonMap'];
        r.textfieldsMap = obj['textfieldsMap'];
        r.boolfieldsMap = obj['boolfieldsMap'];
        r.bytefieldsMap = obj['bytefieldsMap'];
        r.intfieldsMap = obj['intfieldsMap'];
        r.int64fieldsMap = obj['int64fieldsMap'];
        r.uintfieldsMap = obj['uintfieldsMap'];
        r.uint64fieldsMap = obj['uint64fieldsMap'];
        r.doublefieldsMap = obj['doublefieldsMap'];
        r.floatfieldsMap = obj['floatfieldsMap'];
        return r;
    };
    payload.prototype.toProto = function () {
        this.proto = new messages.Payload();
        this._setProto(this.fieldsMap, this.proto.getFieldsMap);
        this._setProto(this.jsonMap, this.proto.getJsonMap);
        this._setProto(this.textfieldsMap, 'getTextfieldsMap');
        this._setProto(this.boolfieldsMap, this.proto.getBoolfieldsMap);
        this._setProto(this.bytefieldsMap, this.proto.getBytefieldsMap);
        this._setProto(this.intfieldsMap, this.proto.getIntfieldsMap);
        this._setProto(this.int64fieldsMap, this.proto.getInt64fieldsMap);
        this._setProto(this.uintfieldsMap, this.proto.getUintfieldsMap);
        this._setProto(this.uint64fieldsMap, this.proto.getUint64fieldsMap);
        this._setProto(this.doublefieldsMap, this.proto.getDoublefieldsMap);
        this._setProto(this.floatfieldsMap, this.proto.getFloatfieldsMap);
        return this.proto;
    };
    payload.prototype.appendFields = function (key, value) { this.fieldsMap.push([key, value]); };
    payload.prototype.appendJson = function (key, value) { this.jsonMap.push([key, value]); };
    payload.prototype.appendTextfields = function (key, value) { this.textfieldsMap.push([key, value]); };
    payload.prototype.appendBoolfields = function (key, value) { this.boolfieldsMap.push([key, value]); };
    payload.prototype.appendBytefields = function (key, value) { this.bytefieldsMap.push([key, value]); };
    payload.prototype.appendIntfields = function (key, value) { this.intfieldsMap.push([key, value]); };
    payload.prototype.appendInt64fields = function (key, value) { this.int64fieldsMap.push([key, value]); };
    payload.prototype.appendUintfields = function (key, value) { this.uintfieldsMap.push([key, value]); };
    payload.prototype.appendUint64fields = function (key, value) { this.uint64fieldsMap.push([key, value]); };
    payload.prototype.appendDoublefields = function (key, value) { this.doublefieldsMap.push([key, value]); };
    payload.prototype.appendFloatfields = function (key, value) { this.floatfieldsMap.push([key, value]); };
    payload.prototype.getFields = function (key) { return this._lookupField('fieldsMap', key); };
    payload.prototype.getJson = function (key) { return this._lookupField('jsonMap', key); };
    payload.prototype.getTextfields = function (key) { return this._lookupField('textfieldsMap', key); };
    payload.prototype.getBoolfields = function (key) { return this._lookupField('boolfieldsMap', key); };
    payload.prototype.getBytefields = function (key) { return this._lookupField('bytefieldsMap', key); };
    payload.prototype.getIntfields = function (key) { return this._lookupField('intfieldsMap', key); };
    payload.prototype.getInt64fields = function (key) { return this._lookupField('int64fieldsMap', key); };
    payload.prototype.getUintfields = function (key) { return this._lookupField('uintfieldsMap', key); };
    payload.prototype.getUint64fields = function (key) { return this._lookupField('uint64fieldsMap', key); };
    payload.prototype.getDoublefields = function (key) { return this._lookupField('doublefieldsMap', key); };
    payload.prototype.getFloatfields = function (key) { return this._lookupField('floatfieldsMap', key); };
    payload.prototype._lookupField = function (field, key) {
        // @ts-ignore
        for (var elem in this[field]) {
            // @ts-ignore
            if (this[field][elem][0] == key) {
                // @ts-ignore
                return this[field][elem][1];
            }
        }
    };
    payload.prototype._setProto = function (field, func) {
        for (var elems in field) {
            this.proto[func]().set(field[elems][0], field[elems][1]);
        }
    };
    return payload;
}());
module.exports = {
    gmbh: gmbh,
    options: options,
    runtimeOptions: runtimeOptions,
    standaloneOptions: standaloneOptions,
    serviceOptions: serviceOptions,
    payload: payload,
};
