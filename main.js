

var gmbh = require('./src/gmbh');

var client;

function main(){

    client = new gmbh.gmbh();
    client.Route("gatherData", gatherData);
    client.Start();

    console.log("after start");
}

function gatherData(sender, request){
    let retval = client.NewPayload();
    retval.appendTextfields("result", `hello from node_service; returning same message; message=${request.getTextfields('xid')}`)
    return retval;
}

main();