var Sync = require('../../lib/sync');

function generateError( code, msg ) {
  var err = new Error( msg );
  err.status = code;
  return err;
}

module.exports = {
  authenticationHandler: function( req, res, next ) {
    var username = req.session && req.session.user && req.session.user.username;
    if ( !username ) {
      return next( generateError( 401, "Webmaker Authentication Required." ) );
    }

    req.params.username = username;
    next();
  },
  crossOriginHandler: function( req, res, next ) {
    res.header( "Access-Control-Allow-Origin", "*" );
    next();
  },
  validateSync: function( expectedState ) {
    return function( req, res, next ) {
      var syncId = req.param( "syncId" );
      var username = req.params.username;

      // Does the user have a sync in progress?
      if ( !Sync.active.checkUser( username ) ) {
        return res.json( 401, { message: "This route requires a sync in progress!" } );
      }

      if ( !syncId ) {
        return res.json( 400, { message: "syncId not passed!" } );
      }

      // Does this user have an active sync from another client?
      if ( !Sync.active.isSyncSession( username, syncId ) ) {
        return res.json( 423, { message: "Sync already in progress, try again later!" } );
      }

      // Confirm the session still contains the sync object,
      // and if not, kill the sync.
      var sync = req.session.sync;
      if ( !sync ) {
        Sync.kill( username );
        return res.json( 500, { message: "Critical error! Sync lost." } );
      }

      // Check if the current sync is in a valid state for this route
      if ( expectedState && sync.state !== expectedState ) {
        return res.json( 401, { message: req.route + " called out of order!" } );
      }

      next();
    };
  }
};