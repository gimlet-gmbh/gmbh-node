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
//@ts-ignore
var atob = require('atob');
var client;
// @ts-ignore
var name;
var verbose;
// gmbh holds that data needed to communicate with core and host 
// a cabal server
var gmbh = /** @class */ (function () {
    function gmbh(opts) {
        // instructions from core
        this.reg = new registration();
        // user configurable options
        this.opts = opts == undefined ? new options() : opts;
        // rpc connection handler to gmbhCore over Cabal        
        this.con = new connection();
        // map that handles function from the user's service
        this.registeredFunctions = {};
        this.myAddress = "";
        // whoIs map [name]address
        //
        // if the name is not found in the map, a whois request will be sent to gmbhCore
        // where it will be determined if the service can make the connection. The resulting
        // address will be stored in this map
        this.whoIs = {};
        this.state = "DISCONNECTED";
        this.msgCnt = 0;
        this.errors = [""];
        this.warnings = [""];
        // parentID is used only when running inside of a remote process manager and is set
        // by the environment
        this.parentID = process.env.REMOTE != undefined ? process.env.REMOTE : "";
        // how to handle signals as set by the environment
        // {M,C,""}
        // M = managed; use sigusr
        // C = containerized
        // "" = standalone
        this.env = process.env.ENV != undefined ? process.env.ENV : "";
        // closed is set true when shutdown procedures have been started
        this.closed = false;
        // global reference to the client for ues by the rpc callbacks
        client = this;
    }
    gmbh.prototype.Start = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            // @ts-ignore
            verbose = _this.opts.runtime.verbose;
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
            // If the address back to core has been set using an environment variable, use that. Otherwise
            // use the one from opts which defaults to the default set from the config package
            if (_this.env == "C") {
                _this.opts.standalone.coreAddress = process.env.CORE != undefined ? process.env.CORE : _this.opts.standalone.coreAddress;
                _this.myAddress = process.env.ADDR != undefined ? process.env.ADDR : "";
                log("using core address from env=" + _this.opts.standalone.coreAddress + " with myAddress=" + _this.myAddress);
            }
            else {
                log("core address=" + _this.opts.standalone.coreAddress);
            }
            // @important -- the only service allowed to be named CoreData is the actual gmbhCore
            if (_this.opts.service.name == "CoreData") {
                reject("CoreData is a reserved service name");
            }
            resolve("");
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
                request.setAddress(_this.myAddress);
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
        if (verbose) {
            console.log();
        } // deadline to align output
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
// registration contains data that is received from core at registration time
var registration = /** @class */ (function () {
    function registration() {
        // id from core
        this.id = "";
        // mode from core
        this.mode = "";
        // address to run internal cabal server
        this.address = "";
        // filesystem path back to core -- UNUSED
        this.corePath = "";
        // a unique identifier from core to identify the client with core on request
        this.fingerprint = "";
    }
    return registration;
}());
// options contain some runtime configurable parameters
var options = /** @class */ (function () {
    function options() {
        // RuntimeOptions are options that affect runtime behavior
        this.runtime = new runtimeOptions();
        // standalone options are those intended for use without the service launcher or remotes
        this.standalone = new standaloneOptions();
        // service options are those that are used for identifying the service with core
        this.service = new serviceOptions();
    }
    return options;
}());
var runtimeOptions = /** @class */ (function () {
    function runtimeOptions() {
        // Should the client block the main thread until shutdown signal is received?
        this.blocking = true;
        // Should the client run in verbose mode. in Verbose mode, debug information regarding
        // the gmbh client will be printed to stdOut
        this.verbose = true;
    }
    return runtimeOptions;
}());
var standaloneOptions = /** @class */ (function () {
    function standaloneOptions() {
        // The address back to core
        // NOTE: This will be overriden depending on environment
        this.coreAddress = COREADDRESS;
    }
    return standaloneOptions;
}());
var serviceOptions = /** @class */ (function () {
    function serviceOptions() {
        // The unique name of the service as registered to core
        this.name = "";
        // Like the name, must be unique across all services; act as shortcut names
        this.aliases = [""];
        // The group_id defines services that are allowed to connect directly with each-
        // other and bypass the core for faster communications.
        //
        // The id assignment is arbitrary as long as each intended one has the same id.
        // NOTE: Any services where the group_id is undefined will be able to talk to
        //       eachother freely.
        this.peerGroups = ["universal"];
    }
    return serviceOptions;
}());
var connection = /** @class */ (function () {
    function connection() {
        // The address that this service should run it's cabal server on, as assigned
        // by core or env
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
    // Data requests are made to other services via this function
    cabal.Data = function (call, callback) {
        return __awaiter(this, void 0, void 0, function () {
            var g, err, request, tport, value, msg_1, result, msg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        g = getClient();
                        if (g == null) {
                            err = new messages.DataResponse();
                            err.setError("core.referr");
                            callback(null, err);
                            return [2 /*return*/];
                        }
                        g.msgCnt++;
                        request = call.request.getRequest();
                        tport = request.getTport();
                        log("==" + g.msgCnt + "==> from=" + tport.getSender() + "; method=" + tport.getMethod());
                        return [4 /*yield*/, handleDataRequest(tport, request.getPload())];
                    case 1:
                        value = _a.sent();
                        if (value == null) {
                            log("issues");
                            msg_1 = new messages.DataResponse();
                            msg_1.setError("handle.request.failed");
                            callback(null, msg_1);
                            return [2 /*return*/];
                        }
                        result = new messages.Responder();
                        result.setPload(value);
                        msg = new messages.DataResponse();
                        msg.setResponder(result);
                        callback(null, msg);
                        return [2 /*return*/];
                }
            });
        });
    };
    // Summary of this service to report to core for dashboard and cli usage
    cabal.Summary = function (call, callback) {
        log("-> Summary Request");
        var fp = call.metadata.get("fingerprint");
        var unknownIDErr = function (msg) {
            if (msg === void 0) { msg = ""; }
            var err = new messages.SummaryReceipt();
            err.setError("unknown.id." + msg);
            log(err);
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
        service.setParentid(g.parentID);
        service.setErrorsList([""]);
        log(service);
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
// handleDataRequest processes the incoming data request by looking up the inteded method in the transport
// and sending the payload to and from the user friendly object.
// Returns the payload in protobuf form
function handleDataRequest(tport, pload) {
    return __awaiter(this, void 0, void 0, function () {
        var g, obj, rpcPayload;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    g = getClient();
                    if (g == null) {
                        return [2 /*return*/, null];
                    }
                    if (g.registeredFunctions[tport.getMethod()] == undefined) {
                        log("undefined method");
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, g.registeredFunctions[tport.getMethod()](tport.getSender(), payload.fromProto(pload))];
                case 1:
                    obj = _a.sent();
                    rpcPayload = obj.toProto();
                    return [2 /*return*/, rpcPayload];
            }
        });
    });
}
var payload = /** @class */ (function () {
    function payload() {
        this.jsonMap = [];
        this.proto = null;
    }
    payload.fromProto = function (pload) {
        var obj = pload.toObject();
        var r = new payload();
        r.jsonMap = obj['jsonMap'];
        return r;
    };
    payload.prototype.toProto = function () {
        this.proto = new messages.Payload();
        this._setProto(this.jsonMap, 'getJsonMap');
        return this.proto;
    };
    payload.prototype.append = function (key, value) {
        this.jsonMap.push([key, this._marshal(value)]);
    };
    payload.prototype.get = function (key) {
        var found = this._lookupField('jsonMap', key);
        if (found) {
            return this._unmarshall(found);
        }
        return "";
    };
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
            try {
                this.proto[func]().set(field[elems][0], field[elems][1]);
            }
            catch (err) {
                log("Probable type error : could not assign " + field[elems][0]);
                log(err);
            }
        }
    };
    // from Uint8Array
    payload.prototype._unmarshall = function (data) {
        var str = "";
        for (var i = 0; i < data.length; i++) {
            str += String.fromCharCode(parseInt(data[i]));
        }
        return JSON.parse(atob(str));
    };
    // to Uint8Array
    payload.prototype._marshal = function (json) {
        var str = JSON.stringify(json, null, 0);
        var ret = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) {
            ret[i] = str.charCodeAt(i);
        }
        return ret;
    };
    return payload;
}());
// getClient
// used to keep track of the global client data for use with the static cabal class
function getClient() {
    return client == undefined ? null : client;
}
// log messages in a standardized way
function log(msg) {
    if (verbose || verbose == undefined) {
        var tag = name == undefined ? "gmbh" : name;
        console.log("[" + timeStamp() + "] [" + tag + "] " + msg);
    }
}
// pprint for timestamp usage in log
function timeStamp() {
    var d = new Date();
    return d.getFullYear() + "/" + d.getMonth() + "/" + d.getDay() + " " + d.getHours() + ":" + d.getMinutes();
}
module.exports = {
    gmbh: gmbh,
    options: options,
    runtimeOptions: runtimeOptions,
    standaloneOptions: standaloneOptions,
    serviceOptions: serviceOptions,
    payload: payload,
};
