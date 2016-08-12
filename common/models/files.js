var CONTAINERS_URL = '/api/Containers/';
var app = require('../../server/server');

module.exports = function(Files) {

  var originalSetup = Files.setup;
  var originalApp = Files.app;
  Files.setup = function() { // this will be called everytime a
    // model is extended from this model.

    originalSetup.apply(this, arguments); // This is necessary if your
    // AnotherModel is based of another model, like PersistedModel.

    this.remoteMethod(
        'upload',
        {
            description: 'Uploads a file',
            accepts: [
                { arg: 'ctx', type: 'object', http: { source:'context' } },
                { arg: 'options', type: 'object', http:{ source: 'query'} }
            ],
            returns: {
                arg: 'fileObject', type: 'object', root: true
            },
            http: {verb: 'post'}
        }
    );

  };

  Files.upload = function (ctx,options,cb) {

      console.log('ctx=',ctx.req.query,'body=',ctx.req.body,'files=',ctx.req.files,'options=');
      if(!options) options = {};
      if(ctx.req.query.container){
        console.log('have container...');
        ctx.req.params.container = ctx.req.query.container;
        Files.app.models.Container.upload(ctx.req,ctx.result,options,function (err,fileObj) {
            if(err) {
                console.log('fail to upload photo = ',err);
                cb(err);
            } else {
                console.log('upload successfully ',fileObj);
                var fileInfo = fileObj.files.file[0];
                Files.create({
                    fileId: 0,
                    fileName: fileInfo.name,
                    fileType: fileInfo.type,
                    fileContainer: fileInfo.container,
                    fileUrl: CONTAINERS_URL+fileInfo.container+'/download/'+fileInfo.name
                },function (err,obj) {
                    if (err !== null) {
                        cb(err);
                    } else {
                        cb(null, obj);
                    }
                });
            }
        });
      }else {
        console.log('have no container');
        cb({err:"No 'container' in params is provided ! "},null);
      }
  };

    Files.remoteMethod(
        'upload',
        {
            description: 'Uploads a file',
            accepts: [
                { arg: 'ctx', type: 'object', http: { source:'context' } },
                { arg: 'options', type: 'object', http:{ source: 'query'} }
            ],
            returns: {
                arg: 'fileObject', type: 'object', root: true
            },
            http: {verb: 'post'}
        }
    );


};
