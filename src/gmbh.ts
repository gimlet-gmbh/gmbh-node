import { AnyARecord } from "dns";

const version = "0.10.0";
const COREADDRESS = "localhost:49500";

var messages = require('./intrigue_pb');
var services = require('./intrigue_grpc_pb');
var grpc = require('grpc');

var client: gmbh;

class gmbh {
    reg: registration | null;
    opts: options;
    con: connection;
    registeredFunctions: any;
    messages: any;
    pongTime: string
    whoIs: Object;
    state: string;
    msgCnt: number;
    errors: [string];
    warnings: [string];
    env: string;
    closed: boolean;
    constructor(opts?: options) {
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

    Start(){
        log("                    _                 ")
        log("  _  ._ _  |_  |_| /  | o  _  ._ _|_  ")
        log(" (_| | | | |_) | | \\_ | | (/_ | | |_ ")
        log("  _|                                  ")
        log(`version=${version}; env=${this.env}`);

        this._connect();
    }

    Route(route: string, handler: Function) {
        this.registeredFunctions[route] = handler;
    }

    MakeRequest(target: string, method:string, data:any): any {

    }

    NewPayload(){
        return new payload();
    }

    _connect(){
        log("attempting to connect to coreData");

        if(this.state == "CONNECTED"){
            log("state reported as connected; returning");
            return;
        }

        this._register()
            .then( (value: registration) => {
                this.reg = value;

                log("registration details");
                log("id=" + this.reg.id + "; address=" + this.reg.address + "; fingerprint=" + this.reg.fingerprint)

                if(this.reg.address == ""){
                    log("address not received");
                    return;
                }

                this.con.address = this.reg.address;
                this.state = "CONNECTED";

                // connect
                this.con.connect()
                    .then((value: string)=>{

                        console.log(value);

                    }).catch( (err:any)=>{

                        console.log(err);

                    });
            })
            .catch( (err: any) => {
                console.log(err); 
            });

    }

    async _register(): Promise<registration> {
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
                request.setAddress("");
                request.setEnv(this.env);

                client.registerService(request, (err: object, resp: any) => {
                    if(err == null){
                        console.log("recieved response");
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
}

class registration {
    id: string;
    mode: string;
    address: string;
    corePath: string;
    fingerprint: string;
    constructor(){
        this.id = "";
        this.mode = "";
        this.address = "";
        this.corePath = "";
        this.fingerprint = "";
    }
}

class options {
    runtime: runtimeOptions;
    standalone: standaloneOptions;
    service: serviceOptions;
    constructor(){
        this.runtime = new runtimeOptions();
        this.standalone = new standaloneOptions();
        this.service = new serviceOptions();
    }
}

class runtimeOptions{
    blocking: boolean;
    verbose: boolean;
    constructor(){
        this.blocking = true;
        this.verbose = true;
    }
}

class standaloneOptions{
    coreAddress: string;
    constructor(){
        this.coreAddress = COREADDRESS; 
    }
}

class serviceOptions{
    name: string;
    aliases: [string];
    peerGroups: [string]
    constructor(){
        this.name = "service";
        this.aliases = [""];
        this.peerGroups = ["universal"];
    }
}

class connection{
    address: string;
    server: any;
    connected: boolean;
    error: [string];

    constructor(){
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

    static Summary(call: any, callback: Function){
        log("-> Summary Request");

        let fp = call.metadata.get("fingerprint");

        let unknownIDErr = (msg="")=>{
            let err = new messages.SummaryReceipt();
            err.setError("unknown.id."+msg);
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
        service.setErrorsList([""]);

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

// handleDataRequest attempts to resolve the registered function with the client to send the 
// payload to for processing.
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


// getClient
// used to keep track of the global client data for use with the static cabal class
function getClient(): gmbh | null {
    return client == undefined ? null : client;
}

// log messages in a standardized way
function log(msg: any){
    console.log(msg);
    // console.log("[time] [gmbh] "+msg);
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


module.exports = {
    gmbh,
    options,
    runtimeOptions,
    standaloneOptions,
    serviceOptions,
    payload,
};













