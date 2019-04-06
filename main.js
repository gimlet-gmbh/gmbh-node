

var gmbh = require('./src/gmbh');

var client;

function main(){

    client = new gmbh.gmbh();
    client.Route("gatherData", gatherData);
    client.opts.service.name = "service";
    client.Start()
        .then(()=>{
            // console.log("returned promise");

            // setTimeout(testRequest, 5000);
        });

    // console.log("after start");
}

function gatherData(sender, request){
    let retval = client.NewPayload();
    retval.appendTextfields("result", `hello from node_service; returning same message; message=${request.getTextfields('xid')}`)
    return retval;
}

async function testRequest(){

    let data = new gmbh.payload();
    data.appendTextfields('xid', 'zxcvqwer12340987');

    let value = await client.MakeRequest("c4", "gatherData", data);
    console.log(value);
}

main();