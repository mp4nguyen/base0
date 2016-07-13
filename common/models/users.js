var config = require('../../server/config.json');
var loopback = require('loopback');
var DEFAULT_RESET_PW_TTL = 15 * 60; // 15 mins in seconds
module.exports = function(Users) {



    // Update user
    Users.updateAccount = function(data,cb) {

        //console.log("data update acc = ",data);

        delete data.company;
        delete data.companyName;

        console.log("data update acc = ",data);

        var comId = loopback.getCurrentContext().active.companyId;

        try {
            if(comId == 112 ){
                if(data.password){
                    var hashPassword = Users.hashPassword(data.password);
                    //console.log("data update acc = ",data,hashPassword);
                    data.password = hashPassword;
                }

                if(data.id == -1){
                    data.id = 0;
                    Users.create(data, function(err,succ){
                        //console.log(" Succ Accounts.updateAttributes",succ,s);
                        console.log("updateAccount  Err = ",err,succ);
                        if(err){
                            cb(err,null)
                        }else{
                            cb(null,succ);
                        }
                    });
                }else{
                    Users.update({id: data.id}, data, function(err,succ){
                        //console.log(" Succ Accounts.updateAttributes",succ,s);
                        console.log("updateAccount  Err = ",err,succ);
                        cb(null,"successfully updated account!");
                    });
                }

            }
            else if(comId > 0 && comId == data.companyId){
                if(data.password){
                    var hashPassword = Users.hashPassword(data.password);
                    //console.log("data update acc = ",data,hashPassword);
                    data.password = hashPassword;
                }

                if(data.id == -1){
                    data.id = 0;
                    Users.create(data, function(err,succ){
                        //console.log(" Succ Accounts.updateAttributes",succ,s);
                        console.log("updateAccount  Err = ",err,succ);
                        if(err){
                            cb(err,null)
                        }else{
                            cb(null,succ);
                        }
                    });
                }else{
                    Users.update({id: data.id}, data, function(err,succ){
                        //console.log(" Succ Accounts.updateAttributes",succ,s);
                        console.log("updateAccount  Err = ",err,succ);
                        cb(null,"successfully updated account!");
                    });
                }

            }
        }
        catch(err) {
            cb(null,err);
            console.log(err);
        }
    };
    Users.remoteMethod('updateAccount', {
        accepts: [
            { arg: 'data', type: 'object', http: { source: 'body' } }
        ],
        returns: {arg: 'users', type: 'array'},
        http: {path:'/updateAccount', verb: 'post'}
    });

    // Update password
    Users.updatePassword = function(data,cb) {
        var accessToken = loopback.getCurrentContext().active.accessToken;
        console.log("data updatePassword acc = ",data,accessToken);

        try {

            if(data.password){
                var hashPassword = Users.hashPassword(data.password);
                //console.log("data update acc = ",data,hashPassword);
                data.password = hashPassword;
                console.log("data updatePassword acc = ",data,accessToken);
                Users.update({id: accessToken.userId}, {password:data.password}, function(succ,s){
                    //console.log(" Succ Accounts.updateAttributes",succ,s);

                    ///delete access token after update password, prevent update 2 times
                    var USER_ID = accessToken.userId;
                    var ACCESS_TOKEN = accessToken.id;
                    // remove just the token
                    var token = new Users.app.models.AccessToken({id: ACCESS_TOKEN});
                    token.destroy();
                    // remove all user tokens
                    Users.app.models.AccessToken.destroyAll({
                      where: {userId: USER_ID}
                    });


                    cb(null,"successfully updated account!");
                });
            }

        }
        catch(err) {
            cb(null,err);
            console.log(err);
        }
    };
    Users.remoteMethod('updatePassword', {
        accepts: [
            { arg: 'data', type: 'object', http: { source: 'body' } }
        ],
        returns: {arg: 'users', type: 'array'},
        http: {path:'/updatePassword', verb: 'post'}
    });

    //resetPassword , override the main function because an email has many accounts
    Users.resetPassword = function(options, cb) {
        console.log(">>>resetPassword :",options);
        cb = cb || utils.createPromiseCallback();
        var UserModel = this;
        var ttl = UserModel.settings.resetPasswordTokenTTL || DEFAULT_RESET_PW_TTL;

        options = options || {};
        if (typeof options.email !== 'string') {
          var err = new Error('Email is required');
          err.statusCode = 400;
          err.code = 'EMAIL_REQUIRED';
          cb(err);
          return cb.promise;
        }

        UserModel.findOne({ where: {email: options.email, username: options.username} }, function(err, user) {
          if (err) {
            return cb(err);
          }
          if (!user) {
            err = new Error('Email and Username not found');
            err.statusCode = 404;
            err.code = 'EMAIL_NOT_FOUND';
            return cb(err);
          }
          // create a short lived access token for temp login to change password
          // TODO(ritch) - eventually this should only allow password change
          user.accessTokens.create({ttl: ttl}, function(err, accessToken) {
            if (err) {
              return cb(err);
            }
            cb();
            UserModel.emit('resetPasswordRequest', {
              email: options.email,
              accessToken: accessToken,
              user: user
            });
          });
        });

        return cb.promise;
  };

    //send password reset link when requested
    Users.on('resetPasswordRequest', function(info) {
        console.log("reset pass ",info);
        var url = 'https://medicalbookings.redimed.com.au:8000/#/reset-pass/' + info.accessToken.id; //' + config.host + ':' + config.port + '


        var fs = require('fs')
            , filename = __dirname+"/accounts_reset_email_template.html";

        fs.readFile(filename, 'utf8', function(err, data) {
            if (err) throw err;

            var html = data;
            html = html.replace(new RegExp("{{action_url}}", 'g'),url);
            html = html.replace("{{name}}",info.user.bookingPerson);

            Users.app.models.Email.send({
                to: info.email,
                from: "healthscreenings@redimed.com.au",
                subject: 'Password reset for account of Pre-employment Online Booking',
                html: html
            }, function(err) {
                if (err) return console.log('> error sending password reset email to '+info.email+' ',err);
                console.log('> sending password reset email to:', info.email);
            });
        });

    });
};
