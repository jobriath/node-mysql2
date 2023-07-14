import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import common from '../../../common.js';
import portfinder from "portfinder";

describe('pool cluster with restoreNodeTimeout', () => {
  it('restores faulty node to pool after timeout', async (done) => {
    const cluster = common.createPoolCluster({
      canRetry             : true,
      removeNodeErrorCount : 2,
      restoreNodeTimeout   : 100
    });

    var server  = common.createFakeServer();
    portfinder.getPort((err, port) => {
      server.listen(port, () => {
        var poolConfig = common.getConfig({port});
        cluster.add('MASTER', poolConfig);

        assert.ifError(err);

        var pool = cluster.of('MASTER', 'ORDER');

        pool.query('SELECT 1', function (err) {
          assert.ok(err);
          assert.equal(err.code, 'POOL_NONEONLINE');
          assert.equal(connCount, 2);

          pool.query('SELECT 1', function (err) {
            assert.ok(err);
            assert.equal(err.code, 'POOL_NONEONLINE');

            offline = false;
          });

          setTimeout(function () {
            pool.query('SELECT 1', function (err) {
              console.log("third", err);
              assert.ifError(err);
              cluster.end(function (err) {
                assert.ifError(err);
                server.destroy();
                done();
              });
            });
          }, 200);
        });
      });
    });

    var connCount  = 0;
    var offline    = true;

    server.on('connection', function (conn) {
      connCount += 1;

      console.log("offline:", offline, "connCount:", connCount);
      if (offline) {
        conn.destroy();
      } else {
        conn.serverHandshake(common.handshakeConfig);
      }
    });
  });
});
