
const version = "0.10.0";
const COREADDRESS = "localhost:49500";

var messages = require('./intrigue_pb');
var services = require('./intrigue_grpc_pb');
var grpc = require('grpc');

var client: gmbh;

// @ts-ignore
var name: string;
var verbose: string;

// gmbh holds that data needed to communicate with core and host 
// a cabal server
class gmbh {
    reg: registration | null;
    opts: options;
    con: connection;
    registeredFunctions: any;
    messages: any;
    pongTime: string
    myAddress: string
    whoIs: any;
    state: string;
    msgCnt: number;
    errors: [string];
    parentID: string
    warnings: [string];
    env: string;
    closed: boolean;
    constructor(opts?: options) {
        // instructions from core
        this.reg = new registration();

	    // user configurable options
        this.opts = opts == undefined ? new options() : opts;

        // rpc connection handler to gmbhCore over Cabal        
        this.con = new connection();

        // map that handles function from the user's service
        this.registeredFunctions = {};

        // unused
        this.pongTime = "";
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

    Start(): Promise<string>{
        return new Promise<string>((resolve, reject)=>{

            log("                    _                 ")
            log("  _  ._ _  |_  |_| /  | o  _  ._ _|_  ")
            log(" (_| | | | |_) | | \\_ | | (/_ | | |_ ")
            log("  _|                                  ")
            log(`version=${version}; env=${this.env}`);
    
            // @ts-ignore
            name = this.opts.service.name;
            // @ts-ignore
            verbose = this.opts.runtime.verbose;
            this._connect();
    
            if(this.env == "M"){
                log("managed mode; ignoring sigint; listening for sigusr2");
                process.on('SIGINT', ()=>{});
                process.on('SIGUSR2', gmbh._shutdown);
            } else {
                process.on('SIGINT', gmbh._shutdown);
            }

            // If the address back to core has been set using an environment variable, use that. Otherwise
            // use the one from opts which defaults to the default set from the config package
            if(this.env == "C"){
                this.opts.standalone.coreAddress = process.env.CORE != undefined ? process.env.CORE : this.opts.standalone.coreAddress;
                this.myAddress = process.env.ADDR != undefined ? process.env.ADDR : "";
                log("using core address from env=" + this.opts.standalone.coreAddress + " with myAddress=" + this.myAddress);
            } else {
                log("core address=" + this.opts.standalone.coreAddress);
            }
        
            // @important -- the only service allowed to be named CoreData is the actual gmbhCore
            if(this.opts.service.name == "CoreData"){
                reject("CoreData is a reserved service name")
            }

            resolve("");
        });
    }

    Route(route: string, handler: Function) {
        this.registeredFunctions[route] = handler;
    }

    async MakeRequest(target: string, method:string, data:payload): Promise<payload> {
        return new Promise<payload>((resolve, reject)=>{
            this._dataRequest(target, method, data)
                .then((responder: any)=>{
                    resolve(payload.fromProto(responder.getPload()));
                }).catch((err: string)=>{
                    reject(new payload());
                });
        });
    }

    NewPayload(){ 
        return new payload(); 
    }

    async _dataRequest(target: string, method: string, data: payload): Promise<any>{
        return new Promise<any>((resolve, reject)=>{
            let g  = getClient();
            if(g == null) { 
                reject("refError");
                return; 
            }

            g._resolveAddress(target)
                .then((value: string)=>{
                    let t = Date.now();

                    let client = new services.CabalClient(this.opts.standalone.coreAddress, grpc.credentials.createInsecure()); 
                    let msg = new messages.DataRequest();


                    let tport = new messages.Transport();
                    tport.setTarget(target);
                    tport.setMethod(method);
                    tport.setSender(this.opts.service.name);

                    let request = new messages.Request();
                    request.setTport(tport);
                    request.setPload(data.toProto());

                    msg.setRequest(request);

                    this.msgCnt++;
                    if(this.env != "C" || process.env.LOGGING == "1"){
                        log("<=" + this.msgCnt + "= target: " + target + ", method: " + method);
                    }

                    client.data(msg, (err: any, reply: any)=>{

                        if(err != null){
                            console.log(err);
                            reject("core.error" + err);
                            return new payload();
                        }

                        if(this.env != "C" || process.env.LOGGING == "1"){
                            let tn: any = new Date();
                            tn = tn - t;
                            log(" =" + this.msgCnt + "=> " + "time=" + tn);
                        }

                        if(reply.getResponder() == null){
                            log("error")
                            console.log(reply);
                            reject("getResponder.error");
                            return;
                        }

                        resolve(reply.getResponder());
                    });
                });
        });
    }

    _resolveAddress(target: string): Promise<string> {
        return new Promise<string>((resolve, reject)=>{

            if(this.whoIs[target] != undefined){
                resolve(this.whoIs[target]);
            }
            
            log("getting address for " + target);

            if(this.reg == null){
                reject("refError");
                return;
            }
            request.whoIs(target, this.opts.service.name, this.reg.fingerprint, this.opts.standalone.coreAddress)
                .then((value: string)=>{
                    // go directly to the taget service
                    resolve(value);
                }).catch((err: any)=>{
                    // go through the core
                    resolve(this.opts.standalone.coreAddress)
                });    
        });
    }

    async _connect(){
        log("attempting to connect to coreData");

        if(this.state == "CONNECTED"){
            log("state reported as connected; returning");
            return;
        }

        this.reg = await this._register();

        log("registration details");
        log("id=" + this.reg.id + "; address=" + this.reg.address + "; fingerprint=" + this.reg.fingerprint)

        if(this.reg.address == ""){
            log("address not received");
            return;
        }

        this.con.address = this.reg.address;
        this.state = "CONNECTED";

        await this.con.connect();
    }

    _register(): Promise<registration> {
        return new Promise<registration>( (resolve,reject)=>{
            let send = ()=>{
                let client = new services.CabalClient(this.opts.standalone.coreAddress, grpc.credentials.createInsecure()); 
                let request = new messages.NewServiceRequest();
                
                let service = new messages.NewService(); 
                service.setName(this.opts.service.name);
                service.setAliasesList(this.opts.service.aliases);
                service.setPeergroupsList(this.opts.service.peerGroups);
                service.setIsclient(true);
                service.setIsserver(true); 

                request.setService(service);
                request.setAddress(this.myAddress);
                request.setEnv(this.env);

                client.registerService(request, (err: object, resp: any) => {
                    if(err == null){
                        if(resp.getMessage() == "acknowledged"){
                            let serviceInfo = resp.getServiceinfo();
                            let r = new registration()
                            r.id = serviceInfo.getId();
                            r.address = serviceInfo.getAddress();
                            r.fingerprint = serviceInfo.getFingerprint();
                            resolve(r);
                        }
                    } else {
                        // TODO
                        // if(this.closed || ()){}
                        log("could not reach gmbh-core, trying again in 5 seconds");
                        setTimeout(send, 5000);
                    }
                });
            }
            send();
        });
    }

    _unregister(addr: string, name: string): Promise<boolean> {
        return new Promise<boolean>( (resolve, reject)=>{
            let client = new services.CabalClient(addr, grpc.credentials.createInsecure()); 
            let request = new messages.ServiceUpdate();
            request.setRequest("shutdown.notif");
            request.setMessage(name);
            client.updateRegistration(request, (err: object, resp: any)=>{
                resolve(true);
            });
        });
    }

    static _shutdown(){
        let g = getClient();
        if(g == null){
            log("refError");
            return;
        }
        if(verbose){ console.log(); }// deadline to align output

        g.closed = true;
        g._unregister(g.opts.standalone.coreAddress, g.opts.service.name).then(()=>{
            if(g != null){
                g.con.disconnect();
            }
            log("shutdown complete");
            process.exit(0);
        });
    }
}

// registration contains data that is received from core at registration time
class registration {
    id: string;
    mode: string;
    address: string;
    corePath: string;
    fingerprint: string;
    constructor(){
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
}

// options contain some runtime configurable parameters
class options {
    runtime: runtimeOptions;
    standalone: standaloneOptions;
    service: serviceOptions;
    constructor(){
        // RuntimeOptions are options that affect runtime behavior
        this.runtime = new runtimeOptions();

        // standalone options are those intended for use without the service launcher or remotes
        this.standalone = new standaloneOptions();

        // service options are those that are used for identifying the service with core
        this.service = new serviceOptions();
    }
}

class runtimeOptions{
    blocking: boolean;
    verbose: boolean;
    constructor(){
        // Should the client block the main thread until shutdown signal is received?
        this.blocking = true;

        // Should the client run in verbose mode. in Verbose mode, debug information regarding
	    // the gmbh client will be printed to stdOut
        this.verbose = true;
    }
}

class standaloneOptions{
    coreAddress: string;
    constructor(){
        // The address back to core
        // NOTE: This will be overriden depending on environment
        this.coreAddress = COREADDRESS; 
    }
}

class serviceOptions{
    name: string;
    aliases: [string];
    peerGroups: [string]
    constructor(){
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
}

class connection{
    address: string;
    server: any;
    connected: boolean;
    error: [string];

    constructor(){
        // The address that this service should run it's cabal server on, as assigned
        // by core or env
        this.address = "";
        this.server = new grpc.Server();
        this.connected = false;
        this.error = [""];
    }

    async connect(): Promise<string> {
        return new Promise<string>( (resolve, reject) => {
            if(this.address == ""){
                reject("connection.connect.noAddress");
            }

            this.server.addService(services.CabalService, {
                registerService: cabal.RegisterService,
                updateRegistration: cabal.UpdateRegistration,
                data: cabal.Data,
                summary: cabal.Summary,
                whoIs: cabal.WhoIs,
                alive: cabal.Alive,
            });

            this.server.bind(this.address, grpc.ServerCredentials.createInsecure());
            this.server.start();

            resolve("CONNECTED");
        });
    }

    disconnect() {}
}

/*
 * cabal 
 *
 * Represents all static functions needed to run the cabal rpc server
 */
class cabal {
    // RegisterService; not supported in client
    static RegisterService(call: any, callback: Function){
        log("register service");
        let msg = new messages.Receipt();
        msg.setMessage("operation.invalid");
        callback(null, msg);
    }

    // UpdateRegistration; for notif of core shutdown
    static UpdateRegistration(call: any, callback: Function){
        log("-> Update Registration");
        let request = call.request.getRequest();
        if (request == "core.shutdown"){
            log("received shutdown");

            let g = getClient();
            if(g != null){
                g.con.server.tryShutdown(()=>{
                    if(g != null){
                        g.con.server = new grpc.Server();
                        g.state = "DISCONNECTED";
                        g._connect();
                    } else {
                        log("error; cannot get reference to client");
                    }
                });
            }

            let resp = new messages.Receipt();
            resp.setMessage("ack");
            callback(null, resp);
            return
        }

        let resp = new messages.Receipt();
        resp.setError("unknown.request");
        callback(null, resp);
    }

    // Data requests are made to other services via this function
    static Data(call: any, callback: Function){

        let g = getClient();
        if(g == null){
            let err = new messages.DataResponse();
            err.setError("core.referr");
            callback(null, err);
            return;
        }
        g.msgCnt++;
        let request = call.request.getRequest();
        let tport = request.getTport();
        log(`==${g.msgCnt}==> from=${tport.getSender()}; method=${tport.getMethod()}`)

        let value = handleDataRequest(tport, request.getPload());
        if(value == null){
            log("issues");
            let msg = new messages.DataResponse();
            msg.setError("handle.request.failed");
            callback(null, msg);
            return;
        }

        let result = new messages.Responder();
        result.setPload(value);

        let msg = new messages.DataResponse();
        msg.setResponder(result);

        callback(null, msg);
    }

    // Summary of this service to report to core for dashboard and cli usage
    static Summary(call: any, callback: Function){
        log("-> Summary Request");

        let fp = call.metadata.get("fingerprint");

        let unknownIDErr = (msg="")=>{
            let err = new messages.SummaryReceipt();
            err.setError("unknown.id."+msg);
            log(err);
            callback(null, err);
        };

        let g = getClient();
        if(g == null){
            unknownIDErr("client.referr");
            return;
        }

        if(g.reg == null){
            unknownIDErr("reg.referr");
            return;
        }

        if(fp != g.reg.fingerprint){
            log("could not match fingerprint," + g.reg.fingerprint + ", " + fp);
            unknownIDErr();
            return;
        }

        let response = new messages.SummaryReceipt();

        let service = new messages.CoreService();
        service.setName(g.opts.service.name);
        service.setAddress(g.reg.address);
        service.setMode(g.env);
        service.setPeergroupsList(g.opts.service.peerGroups);
        service.setParentid(g.parentID);
        service.setErrorsList([""]);

        log(service)

        response.setServicesList([service]);

        callback(null, response);
    }

    // WhoIs; only core should distribute this information
    static WhoIs(call: any, callback: Function){
        let msg = new messages.WhoIsRequest();
        msg.setError("operation.invalid");
        callback(null, msg);
    }

    // Alive; send the time back
    static Alive(call: any, callback: Function){
        let msg = new messages.Pong()
        msg.setTime(new Date());
        callback(null,msg);
    }
}


/*
 * request
 *
 * Contains all static functions needed to make requests to core
 */
class request {
    static whoIs(target:string, name:string, fingerprint: string, address: string): Promise<string> {
        return new Promise<string>((resolve, reject)=>{
            let client = new services.CabalClient(address, grpc.credentials.createInsecure()); 
            let request = new messages.WhoIsRequest();
            request.setTarget(target);
            request.setSender(name);

            let meta = new grpc.Metadata();
            meta.add("sender", name);
            meta.add("target", "core");
            meta.add("fingerprint", fingerprint);

            client.WhoIs(request, meta, (err: any, reply:any)=>{
                if(err != null){ reject(""); }

                let e = reply.getError();
                if(e != ""){ reject(e); }

                resolve(reply.getTargetaddress());
            });
        });
    }

    static Data(){}
    static Register(){}
}


// handleDataRequest processes the incoming data request by looking up the inteded method in the transport
// and sending the payload to and from the user friendly object.
// Returns the payload in protobuf form
function handleDataRequest(tport: any, pload: any): any{
    let g = getClient();
    if(g == null){
        return null;
    }

    if(g.registeredFunctions[tport.getMethod()] == undefined) {
        log("undefined method");
        return null;
    }

    let obj =  g.registeredFunctions[tport.getMethod()](tport.getSender(), payload.fromProto(pload));
    let rpcPayload = obj.toProto();
    return rpcPayload;
}

class payload{
    fieldsMap: Array<Array<any>>;
    jsonMap: Array<Array<any>>;
    textfieldsMap: Array<Array<any>>;
    boolfieldsMap: Array<Array<any>>;
    bytefieldsMap: Array<Array<any>>;
    intfieldsMap: Array<Array<any>>;
    int64fieldsMap: Array<Array<any>>;
    uintfieldsMap: Array<Array<any>>;
    uint64fieldsMap: Array<Array<any>>;
    doublefieldsMap: Array<Array<any>>;
    floatfieldsMap: Array<Array<any>>;

    proto: any;
    constructor(){
        this.fieldsMap = []
        this.jsonMap = []
        this.textfieldsMap = []
        this.boolfieldsMap = []
        this.bytefieldsMap = []
        this.intfieldsMap = []
        this.int64fieldsMap = []
        this.uintfieldsMap = []
        this.uint64fieldsMap = []
        this.doublefieldsMap = []
        this.floatfieldsMap = []

        this.proto = null;
    }

    static fromProto(pload: any): payload {
        let obj = pload.toObject();
        let r = new payload();
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
    }

    toProto(): any {
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
    }

    appendFields(key:string, value: string)        { this.fieldsMap.push([key,value]);}
    appendJson(key:string, value: JSON)            { this.jsonMap.push([key,value]); }
    appendTextfields(key:string, value: string)    { this.textfieldsMap.push([key,value]); }
    appendBoolfields(key:string, value: boolean)   { this.boolfieldsMap.push([key,value]); }
    appendBytefields(key:string, value: any)       { this.bytefieldsMap.push([key,value]); }
    appendIntfields(key:string, value: number)     { this.intfieldsMap.push([key,value]); }
    appendInt64fields(key:string, value: number)   { this.int64fieldsMap.push([key,value]); }
    appendUintfields(key:string, value: number)    { this.uintfieldsMap.push([key,value]); }
    appendUint64fields(key:string, value: number)  { this.uint64fieldsMap.push([key,value]); }
    appendDoublefields(key:string, value: number)  { this.doublefieldsMap.push([key,value]); }
    appendFloatfields(key:string, value: number)   { this.floatfieldsMap.push([key,value]); }

    getFields(key:string)        { return this._lookupField('fieldsMap', key)}
    getJson(key:string)          { return this._lookupField('jsonMap', key); }
    getTextfields(key:string)    { return this._lookupField('textfieldsMap', key); }
    getBoolfields(key:string)    { return this._lookupField('boolfieldsMap', key); }
    getBytefields(key:string)    { return this._lookupField('bytefieldsMap', key); }
    getIntfields(key:string)     { return this._lookupField('intfieldsMap', key); }
    getInt64fields(key:string)   { return this._lookupField('int64fieldsMap', key); }
    getUintfields(key:string)    { return this._lookupField('uintfieldsMap', key); }
    getUint64fields(key:string)  { return this._lookupField('uint64fieldsMap', key); }
    getDoublefields(key:string)  { return this._lookupField('doublefieldsMap', key); }
    getFloatfields(key:string)   { return this._lookupField('floatfieldsMap', key); }

    _lookupField(field: any, key:any) {
        // @ts-ignore
        for(let elem in this[field]){
            // @ts-ignore
            if(this[field][elem][0] == key){
                // @ts-ignore
                return this[field][elem][1];
            }
        }
    }

    _setProto(field: any, func: any){
        for(let elems in field){
            this.proto[func]().set(field[elems][0],field[elems][1]);
        }
    }
}

// getClient
// used to keep track of the global client data for use with the static cabal class
function getClient(): gmbh | null {
    return client == undefined ? null : client;
}

// log messages in a standardized way
function log(msg: any){
    if(verbose || verbose == undefined){
        let tag = name == undefined ? "gmbh" : name;
        console.log("["+ timeStamp() + "] ["+tag+"] " + msg);
    }
}

// pprint for timestamp usage in log
function timeStamp(): string {
    let d = new Date();
    return d.getFullYear() + "/" + d.getMonth() + "/" + d.getDay() + " " + d.getHours() + ":" + d.getMinutes();
}

module.exports = {
    gmbh,
    options,
    runtimeOptions,
    standaloneOptions,
    serviceOptions,
    payload,
};