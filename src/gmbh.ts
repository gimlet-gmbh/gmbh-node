import { AnyARecord } from "dns";

const version = "0.10.0";
const COREADDRESS = "localhost:49500";

var messages = require('./intrigue_pb');
var services = require('./intrigue_grpc_pb');

var grpc = require('grpc');

class gmbh {
    reg: registration | null;
    opts: options;
    con: connection;
    registeredFunctions: Object;
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
    }

    start(){
        log("                    _                 ")
        log("  _  ._ _  |_  |_| /  | o  _  ._ _|_  ")
        log(" (_| | | | |_) | | \\_ | | (/_ | | |_ ")
        log("  _|                                  ")
        log(`version=${version}; env=${this.env}`);

        this.register();
    }

    register(){
        log("attempting to connect to coreData");

        if(this.state == "CONNECTED"){
            log("state reported as connected; returning");
            return;
        }

        this.reg = this.getRegistration();
        console.log(this.reg);

    }

    async getRegistration(): Promise<registration> {

        let client = new services.CabalClient(this.opts.standalone.coreAddress, grpc.credentials.createInsecure());
        let request = new messages.NewServiceRequest();
        let service = new messages.NewService();
    
    
        service.name = this.opts.service.name;
        service.aliases = this.opts.service.aliases;
        service.peerGroups = this.opts.service.peerGroups;
        service.isClient = true;
        service.isServer = true;
    
        request.NewService = service;
        request.Address = "";
        request.Env = "";
    
        client.registerService(request, (err: object, resp: any) => {
            if(err != null){
                return null;
            }
            if(resp.getMessage() == "acknowledged"){
                let serviceInfo = resp.getServiceinfo();
                let r = new registration()
                r.id = serviceInfo.getId();
                r.address = serviceInfo.getAddress();
                r.fingerprint = serviceInfo.getFingerprint();
                return r;
            }
        });
        return null;
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
    // Server: Any;
    // cabal: in
    address: string;
    connected: boolean;
    error: [string];
    constructor(){
        this.address = "";
        this.connected = false;
        this.error = [""];
    }
}

module.exports = {
    gmbh,
    options,
    runtimeOptions,
    standaloneOptions,
    serviceOptions,
};


function log(msg: string){
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