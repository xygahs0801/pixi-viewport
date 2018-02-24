'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var exists = require('exists');

var Plugin = require('./plugin');
module.exports = function (_Plugin) {
    _inherits(Drag, _Plugin);

    /**
     * enable one-finger touch to drag
     * @private
     * @param {Viewport} parent
     * @param {object} [options]
     * @param {string} [options.direction=all] direction to drag (all, x, or y)
     * @param {boolean} [options.wheel=true] use wheel to scroll in y direction (unless wheel plugin is active)
     * @param {number} [options.wheelScroll=1] number of pixels to scroll with each wheel spin
     * @param {boolean} [options.reverse] reverse the direction of the wheel scroll
     * @param {boolean|string} [options.clampWheel] (true, x, or y) clamp wheel (to avoid weird bounce with mouse wheel)
     * @param {string} [options.underflow=center] (top/bottom/center and left/right/center, or center) where to place world if too small for screen
     */
    function Drag(parent, options) {
        _classCallCheck(this, Drag);

        options = options || {};

        var _this = _possibleConstructorReturn(this, (Drag.__proto__ || Object.getPrototypeOf(Drag)).call(this, parent));

        _this.moved = false;
        _this.wheelActive = exists(options.wheel) ? options.wheel : true;
        _this.wheelScroll = options.wheelScroll || 1;
        _this.reverse = options.reverse ? 1 : -1;
        _this.clampWheel = options.clampWheel;
        _this.xDirection = !options.direction || options.direction === 'all' || options.direction === 'x';
        _this.yDirection = !options.direction || options.direction === 'all' || options.direction === 'y';
        _this.parseUnderflow(options.underflow || 'center');
        return _this;
    }

    _createClass(Drag, [{
        key: 'parseUnderflow',
        value: function parseUnderflow(clamp) {
            clamp = clamp.toLowerCase();
            if (clamp === 'center') {
                this.underflowX = 0;
                this.underflowY = 0;
            } else {
                this.underflowX = clamp.indexOf('left') !== -1 ? -1 : clamp.indexOf('right') !== -1 ? 1 : 0;
                this.underflowY = clamp.indexOf('top') !== -1 ? -1 : clamp.indexOf('bottom') !== -1 ? 1 : 0;
            }
        }
    }, {
        key: 'down',
        value: function down(e) {
            if (this.paused) {
                return;
            }
            var isWidthScreen = window.innerWidth > window.innerHeight;
            var x = isWidthScreen ? e.data.global.x : e.data.global.y;
            var y = isWidthScreen ? e.data.global.y : e.data.global.x;
            if (this.parent.countDownPointers() === 1) {
                this.last = { x: x, y: y };
            } else {
                this.last = null;
            }
        }
    }, {
        key: 'move',
        value: function move(e) {
            if (this.paused) {
                return;
            }
            if (this.last) {
                var isWidthScreen = window.innerWidth > window.innerHeight;
                var x = isWidthScreen ? e.data.global.x : e.data.global.y;
                var y = isWidthScreen ? e.data.global.y : e.data.global.x;
                var count = this.parent.countDownPointers();
                if (count === 1 || count > 1 && !this.parent.plugins['pinch']) {
                    var distX = x - this.last.x;
                    var distY = y - this.last.y;
                    if (this.moved || this.xDirection && this.parent.checkThreshold(distX) || this.yDirection && this.parent.checkThreshold(distY)) {
                        if (this.xDirection) {
                            this.parent.x += distX;
                        }
                        if (this.yDirection) {
                            this.parent.y += distY;
                        }
                        this.last = { x: x, y: y };
                        if (!this.moved) {
                            this.parent.emit('drag-start', { screen: this.last, world: this.parent.toWorld(this.last), viewport: this.parent });
                        }
                        this.moved = true;
                        this.parent.dirty = true;
                    }
                } else {
                    this.moved = false;
                }
            }
        }
    }, {
        key: 'up',
        value: function up() {
            var touches = this.parent.getTouchPointers();
            if (touches.length === 1) {
                var pointer = touches[0];
                if (pointer.last) {
                    this.last = { x: pointer.last.x, y: pointer.last.y };
                }
                this.moved = false;
            } else if (this.last) {
                if (this.moved) {
                    this.parent.emit('drag-end', { screen: this.last, world: this.parent.toWorld(this.last), viewport: this.parent });
                    this.last = this.moved = false;
                }
            }
        }
    }, {
        key: 'wheel',
        value: function wheel(dx, dy) {
            if (this.paused) {
                return;
            }

            if (this.wheelActive) {
                var wheel = this.parent.plugins['wheel'];
                if (!wheel) {
                    this.parent.x += dx * this.wheelScroll * this.reverse;
                    this.parent.y += dy * this.wheelScroll * this.reverse;
                    if (this.clampWheel) {
                        this.clamp();
                    }
                    this.parent.emit('wheel-scroll', this.parent);
                    this.parent.dirty = true;
                    return true;
                }
            }
        }
    }, {
        key: 'resume',
        value: function resume() {
            this.last = null;
            this.paused = false;
        }
    }, {
        key: 'clamp',
        value: function clamp() {
            var oob = this.parent.OOB();
            var point = oob.cornerPoint;
            var decelerate = this.parent.plugins['decelerate'] || {};
            if (this.clampWheel !== 'y') {
                if (this.parent.screenWorldWidth < this.parent.screenWidth) {
                    switch (this.underflowX) {
                        case -1:
                            this.parent.x = 0;
                            break;
                        case 1:
                            this.parent.x = this.parent.screenWidth - this.parent.screenWorldWidth;
                            break;
                        default:
                            this.parent.x = (this.parent.screenWidth - this.parent.screenWorldWidth) / 2;
                    }
                } else {
                    if (oob.left) {
                        this.parent.x = 0;
                        decelerate.x = 0;
                    } else if (oob.right) {
                        this.parent.x = -point.x;
                        decelerate.x = 0;
                    }
                }
            }
            if (this.clampWheel !== 'x') {
                if (this.parent.screenWorldHeight < this.parent.screenHeight) {
                    switch (this.underflowY) {
                        case -1:
                            this.parent.y = 0;
                            break;
                        case 1:
                            this.parent.y = this.parent.screenHeight - this.parent.screenWorldHeight;
                            break;
                        default:
                            this.parent.y = (this.parent.screenHeight - this.parent.screenWorldHeight) / 2;
                    }
                } else {
                    if (oob.top) {
                        this.parent.y = 0;
                        decelerate.y = 0;
                    } else if (oob.bottom) {
                        this.parent.y = -point.y;
                        decelerate.y = 0;
                    }
                }
            }
        }
    }, {
        key: 'active',
        get: function get() {
            return this.moved;
        }
    }]);

    return Drag;
}(Plugin);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9kcmFnLmpzIl0sIm5hbWVzIjpbImV4aXN0cyIsInJlcXVpcmUiLCJQbHVnaW4iLCJtb2R1bGUiLCJleHBvcnRzIiwicGFyZW50Iiwib3B0aW9ucyIsIm1vdmVkIiwid2hlZWxBY3RpdmUiLCJ3aGVlbCIsIndoZWVsU2Nyb2xsIiwicmV2ZXJzZSIsImNsYW1wV2hlZWwiLCJ4RGlyZWN0aW9uIiwiZGlyZWN0aW9uIiwieURpcmVjdGlvbiIsInBhcnNlVW5kZXJmbG93IiwidW5kZXJmbG93IiwiY2xhbXAiLCJ0b0xvd2VyQ2FzZSIsInVuZGVyZmxvd1giLCJ1bmRlcmZsb3dZIiwiaW5kZXhPZiIsImUiLCJwYXVzZWQiLCJpc1dpZHRoU2NyZWVuIiwid2luZG93IiwiaW5uZXJXaWR0aCIsImlubmVySGVpZ2h0IiwieCIsImRhdGEiLCJnbG9iYWwiLCJ5IiwiY291bnREb3duUG9pbnRlcnMiLCJsYXN0IiwiY291bnQiLCJwbHVnaW5zIiwiZGlzdFgiLCJkaXN0WSIsImNoZWNrVGhyZXNob2xkIiwiZW1pdCIsInNjcmVlbiIsIndvcmxkIiwidG9Xb3JsZCIsInZpZXdwb3J0IiwiZGlydHkiLCJ0b3VjaGVzIiwiZ2V0VG91Y2hQb2ludGVycyIsImxlbmd0aCIsInBvaW50ZXIiLCJkeCIsImR5Iiwib29iIiwiT09CIiwicG9pbnQiLCJjb3JuZXJQb2ludCIsImRlY2VsZXJhdGUiLCJzY3JlZW5Xb3JsZFdpZHRoIiwic2NyZWVuV2lkdGgiLCJsZWZ0IiwicmlnaHQiLCJzY3JlZW5Xb3JsZEhlaWdodCIsInNjcmVlbkhlaWdodCIsInRvcCIsImJvdHRvbSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLElBQU1BLFNBQVNDLFFBQVEsUUFBUixDQUFmOztBQUVBLElBQU1DLFNBQVNELFFBQVEsVUFBUixDQUFmO0FBQ0FFLE9BQU9DLE9BQVA7QUFBQTs7QUFDSTs7Ozs7Ozs7Ozs7O0FBWUEsa0JBQVlDLE1BQVosRUFBb0JDLE9BQXBCLEVBQTZCO0FBQUE7O0FBQ3pCQSxrQkFBVUEsV0FBVyxFQUFyQjs7QUFEeUIsZ0hBRW5CRCxNQUZtQjs7QUFHekIsY0FBS0UsS0FBTCxHQUFhLEtBQWI7QUFDQSxjQUFLQyxXQUFMLEdBQW1CUixPQUFPTSxRQUFRRyxLQUFmLElBQXdCSCxRQUFRRyxLQUFoQyxHQUF3QyxJQUEzRDtBQUNBLGNBQUtDLFdBQUwsR0FBbUJKLFFBQVFJLFdBQVIsSUFBdUIsQ0FBMUM7QUFDQSxjQUFLQyxPQUFMLEdBQWVMLFFBQVFLLE9BQVIsR0FBa0IsQ0FBbEIsR0FBc0IsQ0FBQyxDQUF0QztBQUNBLGNBQUtDLFVBQUwsR0FBa0JOLFFBQVFNLFVBQTFCO0FBQ0EsY0FBS0MsVUFBTCxHQUFrQixDQUFDUCxRQUFRUSxTQUFULElBQXNCUixRQUFRUSxTQUFSLEtBQXNCLEtBQTVDLElBQXFEUixRQUFRUSxTQUFSLEtBQXNCLEdBQTdGO0FBQ0EsY0FBS0MsVUFBTCxHQUFrQixDQUFDVCxRQUFRUSxTQUFULElBQXNCUixRQUFRUSxTQUFSLEtBQXNCLEtBQTVDLElBQXFEUixRQUFRUSxTQUFSLEtBQXNCLEdBQTdGO0FBQ0EsY0FBS0UsY0FBTCxDQUFvQlYsUUFBUVcsU0FBUixJQUFxQixRQUF6QztBQVZ5QjtBQVc1Qjs7QUF4Qkw7QUFBQTtBQUFBLHVDQTBCbUJDLEtBMUJuQixFQTBCMEI7QUFDbEJBLG9CQUFRQSxNQUFNQyxXQUFOLEVBQVI7QUFDQSxnQkFBSUQsVUFBVSxRQUFkLEVBQXdCO0FBQ3BCLHFCQUFLRSxVQUFMLEdBQWtCLENBQWxCO0FBQ0EscUJBQUtDLFVBQUwsR0FBa0IsQ0FBbEI7QUFDSCxhQUhELE1BSUs7QUFDRCxxQkFBS0QsVUFBTCxHQUFtQkYsTUFBTUksT0FBTixDQUFjLE1BQWQsTUFBMEIsQ0FBQyxDQUE1QixHQUFpQyxDQUFDLENBQWxDLEdBQXVDSixNQUFNSSxPQUFOLENBQWMsT0FBZCxNQUEyQixDQUFDLENBQTdCLEdBQWtDLENBQWxDLEdBQXNDLENBQTlGO0FBQ0EscUJBQUtELFVBQUwsR0FBbUJILE1BQU1JLE9BQU4sQ0FBYyxLQUFkLE1BQXlCLENBQUMsQ0FBM0IsR0FBZ0MsQ0FBQyxDQUFqQyxHQUFzQ0osTUFBTUksT0FBTixDQUFjLFFBQWQsTUFBNEIsQ0FBQyxDQUE5QixHQUFtQyxDQUFuQyxHQUF1QyxDQUE5RjtBQUNIO0FBQ0o7QUFwQ0w7QUFBQTtBQUFBLDZCQXNDU0MsQ0F0Q1QsRUFzQ1k7QUFDSixnQkFBSSxLQUFLQyxNQUFULEVBQWlCO0FBQ2I7QUFDSDtBQUNELGdCQUFJQyxnQkFBZ0JDLE9BQU9DLFVBQVAsR0FBb0JELE9BQU9FLFdBQS9DO0FBQ0EsZ0JBQU1DLElBQUlKLGdCQUFnQkYsRUFBRU8sSUFBRixDQUFPQyxNQUFQLENBQWNGLENBQTlCLEdBQWtDTixFQUFFTyxJQUFGLENBQU9DLE1BQVAsQ0FBY0MsQ0FBMUQ7QUFDQSxnQkFBTUEsSUFBSVAsZ0JBQWdCRixFQUFFTyxJQUFGLENBQU9DLE1BQVAsQ0FBY0MsQ0FBOUIsR0FBa0NULEVBQUVPLElBQUYsQ0FBT0MsTUFBUCxDQUFjRixDQUExRDtBQUNBLGdCQUFJLEtBQUt4QixNQUFMLENBQVk0QixpQkFBWixPQUFvQyxDQUF4QyxFQUEyQztBQUN2QyxxQkFBS0MsSUFBTCxHQUFZLEVBQUVMLElBQUYsRUFBS0csSUFBTCxFQUFaO0FBQ0gsYUFGRCxNQUdLO0FBQ0QscUJBQUtFLElBQUwsR0FBWSxJQUFaO0FBQ0g7QUFDSjtBQW5ETDtBQUFBO0FBQUEsNkJBeURTWCxDQXpEVCxFQXlEWTtBQUNKLGdCQUFJLEtBQUtDLE1BQVQsRUFBaUI7QUFDYjtBQUNIO0FBQ0QsZ0JBQUksS0FBS1UsSUFBVCxFQUFlO0FBQ1gsb0JBQUlULGdCQUFnQkMsT0FBT0MsVUFBUCxHQUFvQkQsT0FBT0UsV0FBL0M7QUFDQSxvQkFBTUMsSUFBSUosZ0JBQWdCRixFQUFFTyxJQUFGLENBQU9DLE1BQVAsQ0FBY0YsQ0FBOUIsR0FBa0NOLEVBQUVPLElBQUYsQ0FBT0MsTUFBUCxDQUFjQyxDQUExRDtBQUNBLG9CQUFNQSxJQUFJUCxnQkFBZ0JGLEVBQUVPLElBQUYsQ0FBT0MsTUFBUCxDQUFjQyxDQUE5QixHQUFrQ1QsRUFBRU8sSUFBRixDQUFPQyxNQUFQLENBQWNGLENBQTFEO0FBQ0Esb0JBQU1NLFFBQVEsS0FBSzlCLE1BQUwsQ0FBWTRCLGlCQUFaLEVBQWQ7QUFDQSxvQkFBSUUsVUFBVSxDQUFWLElBQWdCQSxRQUFRLENBQVIsSUFBYSxDQUFDLEtBQUs5QixNQUFMLENBQVkrQixPQUFaLENBQW9CLE9BQXBCLENBQWxDLEVBQWlFO0FBQzdELHdCQUFJQyxRQUFRUixJQUFJLEtBQUtLLElBQUwsQ0FBVUwsQ0FBMUI7QUFDQSx3QkFBSVMsUUFBUU4sSUFBSSxLQUFLRSxJQUFMLENBQVVGLENBQTFCO0FBQ0Esd0JBQUksS0FBS3pCLEtBQUwsSUFBZ0IsS0FBS00sVUFBTCxJQUFtQixLQUFLUixNQUFMLENBQVlrQyxjQUFaLENBQTJCRixLQUEzQixDQUFwQixJQUEyRCxLQUFLdEIsVUFBTCxJQUFtQixLQUFLVixNQUFMLENBQVlrQyxjQUFaLENBQTJCRCxLQUEzQixDQUFqRyxFQUFzSTtBQUNsSSw0QkFBSSxLQUFLekIsVUFBVCxFQUFxQjtBQUNqQixpQ0FBS1IsTUFBTCxDQUFZd0IsQ0FBWixJQUFpQlEsS0FBakI7QUFDSDtBQUNELDRCQUFJLEtBQUt0QixVQUFULEVBQXFCO0FBQ2pCLGlDQUFLVixNQUFMLENBQVkyQixDQUFaLElBQWlCTSxLQUFqQjtBQUNIO0FBQ0QsNkJBQUtKLElBQUwsR0FBWSxFQUFFTCxJQUFGLEVBQUtHLElBQUwsRUFBWjtBQUNBLDRCQUFJLENBQUMsS0FBS3pCLEtBQVYsRUFBaUI7QUFDYixpQ0FBS0YsTUFBTCxDQUFZbUMsSUFBWixDQUFpQixZQUFqQixFQUErQixFQUFFQyxRQUFRLEtBQUtQLElBQWYsRUFBcUJRLE9BQU8sS0FBS3JDLE1BQUwsQ0FBWXNDLE9BQVosQ0FBb0IsS0FBS1QsSUFBekIsQ0FBNUIsRUFBNERVLFVBQVUsS0FBS3ZDLE1BQTNFLEVBQS9CO0FBQ0g7QUFDRCw2QkFBS0UsS0FBTCxHQUFhLElBQWI7QUFDQSw2QkFBS0YsTUFBTCxDQUFZd0MsS0FBWixHQUFvQixJQUFwQjtBQUNIO0FBQ0osaUJBakJELE1Ba0JLO0FBQ0QseUJBQUt0QyxLQUFMLEdBQWEsS0FBYjtBQUNIO0FBQ0o7QUFDSjtBQXhGTDtBQUFBO0FBQUEsNkJBMEZTO0FBQ0QsZ0JBQU11QyxVQUFVLEtBQUt6QyxNQUFMLENBQVkwQyxnQkFBWixFQUFoQjtBQUNBLGdCQUFJRCxRQUFRRSxNQUFSLEtBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLG9CQUFNQyxVQUFVSCxRQUFRLENBQVIsQ0FBaEI7QUFDQSxvQkFBSUcsUUFBUWYsSUFBWixFQUFrQjtBQUNkLHlCQUFLQSxJQUFMLEdBQVksRUFBRUwsR0FBR29CLFFBQVFmLElBQVIsQ0FBYUwsQ0FBbEIsRUFBcUJHLEdBQUdpQixRQUFRZixJQUFSLENBQWFGLENBQXJDLEVBQVo7QUFDSDtBQUNELHFCQUFLekIsS0FBTCxHQUFhLEtBQWI7QUFDSCxhQU5ELE1BT0ssSUFBSSxLQUFLMkIsSUFBVCxFQUFlO0FBQ2hCLG9CQUFJLEtBQUszQixLQUFULEVBQWdCO0FBQ1oseUJBQUtGLE1BQUwsQ0FBWW1DLElBQVosQ0FBaUIsVUFBakIsRUFBNkIsRUFBRUMsUUFBUSxLQUFLUCxJQUFmLEVBQXFCUSxPQUFPLEtBQUtyQyxNQUFMLENBQVlzQyxPQUFaLENBQW9CLEtBQUtULElBQXpCLENBQTVCLEVBQTREVSxVQUFVLEtBQUt2QyxNQUEzRSxFQUE3QjtBQUNBLHlCQUFLNkIsSUFBTCxHQUFZLEtBQUszQixLQUFMLEdBQWEsS0FBekI7QUFDSDtBQUNKO0FBQ0o7QUF6R0w7QUFBQTtBQUFBLDhCQTJHVTJDLEVBM0dWLEVBMkdjQyxFQTNHZCxFQTJHa0I7QUFDVixnQkFBSSxLQUFLM0IsTUFBVCxFQUFpQjtBQUNiO0FBQ0g7O0FBRUQsZ0JBQUksS0FBS2hCLFdBQVQsRUFBc0I7QUFDbEIsb0JBQU1DLFFBQVEsS0FBS0osTUFBTCxDQUFZK0IsT0FBWixDQUFvQixPQUFwQixDQUFkO0FBQ0Esb0JBQUksQ0FBQzNCLEtBQUwsRUFBWTtBQUNSLHlCQUFLSixNQUFMLENBQVl3QixDQUFaLElBQWlCcUIsS0FBSyxLQUFLeEMsV0FBVixHQUF3QixLQUFLQyxPQUE5QztBQUNBLHlCQUFLTixNQUFMLENBQVkyQixDQUFaLElBQWlCbUIsS0FBSyxLQUFLekMsV0FBVixHQUF3QixLQUFLQyxPQUE5QztBQUNBLHdCQUFJLEtBQUtDLFVBQVQsRUFBcUI7QUFDakIsNkJBQUtNLEtBQUw7QUFDSDtBQUNELHlCQUFLYixNQUFMLENBQVltQyxJQUFaLENBQWlCLGNBQWpCLEVBQWlDLEtBQUtuQyxNQUF0QztBQUNBLHlCQUFLQSxNQUFMLENBQVl3QyxLQUFaLEdBQW9CLElBQXBCO0FBQ0EsMkJBQU8sSUFBUDtBQUNIO0FBQ0o7QUFDSjtBQTdITDtBQUFBO0FBQUEsaUNBK0hhO0FBQ0wsaUJBQUtYLElBQUwsR0FBWSxJQUFaO0FBQ0EsaUJBQUtWLE1BQUwsR0FBYyxLQUFkO0FBQ0g7QUFsSUw7QUFBQTtBQUFBLGdDQW9JWTtBQUNKLGdCQUFNNEIsTUFBTSxLQUFLL0MsTUFBTCxDQUFZZ0QsR0FBWixFQUFaO0FBQ0EsZ0JBQU1DLFFBQVFGLElBQUlHLFdBQWxCO0FBQ0EsZ0JBQU1DLGFBQWEsS0FBS25ELE1BQUwsQ0FBWStCLE9BQVosQ0FBb0IsWUFBcEIsS0FBcUMsRUFBeEQ7QUFDQSxnQkFBSSxLQUFLeEIsVUFBTCxLQUFvQixHQUF4QixFQUE2QjtBQUN6QixvQkFBSSxLQUFLUCxNQUFMLENBQVlvRCxnQkFBWixHQUErQixLQUFLcEQsTUFBTCxDQUFZcUQsV0FBL0MsRUFBNEQ7QUFDeEQsNEJBQVEsS0FBS3RDLFVBQWI7QUFDSSw2QkFBSyxDQUFDLENBQU47QUFDSSxpQ0FBS2YsTUFBTCxDQUFZd0IsQ0FBWixHQUFnQixDQUFoQjtBQUNBO0FBQ0osNkJBQUssQ0FBTDtBQUNJLGlDQUFLeEIsTUFBTCxDQUFZd0IsQ0FBWixHQUFpQixLQUFLeEIsTUFBTCxDQUFZcUQsV0FBWixHQUEwQixLQUFLckQsTUFBTCxDQUFZb0QsZ0JBQXZEO0FBQ0E7QUFDSjtBQUNJLGlDQUFLcEQsTUFBTCxDQUFZd0IsQ0FBWixHQUFnQixDQUFDLEtBQUt4QixNQUFMLENBQVlxRCxXQUFaLEdBQTBCLEtBQUtyRCxNQUFMLENBQVlvRCxnQkFBdkMsSUFBMkQsQ0FBM0U7QUFSUjtBQVVILGlCQVhELE1BWUs7QUFDRCx3QkFBSUwsSUFBSU8sSUFBUixFQUFjO0FBQ1YsNkJBQUt0RCxNQUFMLENBQVl3QixDQUFaLEdBQWdCLENBQWhCO0FBQ0EyQixtQ0FBVzNCLENBQVgsR0FBZSxDQUFmO0FBQ0gscUJBSEQsTUFJSyxJQUFJdUIsSUFBSVEsS0FBUixFQUFlO0FBQ2hCLDZCQUFLdkQsTUFBTCxDQUFZd0IsQ0FBWixHQUFnQixDQUFDeUIsTUFBTXpCLENBQXZCO0FBQ0EyQixtQ0FBVzNCLENBQVgsR0FBZSxDQUFmO0FBQ0g7QUFDSjtBQUNKO0FBQ0QsZ0JBQUksS0FBS2pCLFVBQUwsS0FBb0IsR0FBeEIsRUFBNkI7QUFDekIsb0JBQUksS0FBS1AsTUFBTCxDQUFZd0QsaUJBQVosR0FBZ0MsS0FBS3hELE1BQUwsQ0FBWXlELFlBQWhELEVBQThEO0FBQzFELDRCQUFRLEtBQUt6QyxVQUFiO0FBQ0ksNkJBQUssQ0FBQyxDQUFOO0FBQ0ksaUNBQUtoQixNQUFMLENBQVkyQixDQUFaLEdBQWdCLENBQWhCO0FBQ0E7QUFDSiw2QkFBSyxDQUFMO0FBQ0ksaUNBQUszQixNQUFMLENBQVkyQixDQUFaLEdBQWlCLEtBQUszQixNQUFMLENBQVl5RCxZQUFaLEdBQTJCLEtBQUt6RCxNQUFMLENBQVl3RCxpQkFBeEQ7QUFDQTtBQUNKO0FBQ0ksaUNBQUt4RCxNQUFMLENBQVkyQixDQUFaLEdBQWdCLENBQUMsS0FBSzNCLE1BQUwsQ0FBWXlELFlBQVosR0FBMkIsS0FBS3pELE1BQUwsQ0FBWXdELGlCQUF4QyxJQUE2RCxDQUE3RTtBQVJSO0FBVUgsaUJBWEQsTUFZSztBQUNELHdCQUFJVCxJQUFJVyxHQUFSLEVBQWE7QUFDVCw2QkFBSzFELE1BQUwsQ0FBWTJCLENBQVosR0FBZ0IsQ0FBaEI7QUFDQXdCLG1DQUFXeEIsQ0FBWCxHQUFlLENBQWY7QUFDSCxxQkFIRCxNQUlLLElBQUlvQixJQUFJWSxNQUFSLEVBQWdCO0FBQ2pCLDZCQUFLM0QsTUFBTCxDQUFZMkIsQ0FBWixHQUFnQixDQUFDc0IsTUFBTXRCLENBQXZCO0FBQ0F3QixtQ0FBV3hCLENBQVgsR0FBZSxDQUFmO0FBQ0g7QUFDSjtBQUNKO0FBQ0o7QUF4TEw7QUFBQTtBQUFBLDRCQXFEaUI7QUFDVCxtQkFBTyxLQUFLekIsS0FBWjtBQUNIO0FBdkRMOztBQUFBO0FBQUEsRUFBb0NMLE1BQXBDIiwiZmlsZSI6ImRyYWcuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBleGlzdHMgPSByZXF1aXJlKCdleGlzdHMnKVxyXG5cclxuY29uc3QgUGx1Z2luID0gcmVxdWlyZSgnLi9wbHVnaW4nKVxyXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIERyYWcgZXh0ZW5kcyBQbHVnaW4ge1xyXG4gICAgLyoqXHJcbiAgICAgKiBlbmFibGUgb25lLWZpbmdlciB0b3VjaCB0byBkcmFnXHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICogQHBhcmFtIHtWaWV3cG9ydH0gcGFyZW50XHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuZGlyZWN0aW9uPWFsbF0gZGlyZWN0aW9uIHRvIGRyYWcgKGFsbCwgeCwgb3IgeSlcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMud2hlZWw9dHJ1ZV0gdXNlIHdoZWVsIHRvIHNjcm9sbCBpbiB5IGRpcmVjdGlvbiAodW5sZXNzIHdoZWVsIHBsdWdpbiBpcyBhY3RpdmUpXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMud2hlZWxTY3JvbGw9MV0gbnVtYmVyIG9mIHBpeGVscyB0byBzY3JvbGwgd2l0aCBlYWNoIHdoZWVsIHNwaW5cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMucmV2ZXJzZV0gcmV2ZXJzZSB0aGUgZGlyZWN0aW9uIG9mIHRoZSB3aGVlbCBzY3JvbGxcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxzdHJpbmd9IFtvcHRpb25zLmNsYW1wV2hlZWxdICh0cnVlLCB4LCBvciB5KSBjbGFtcCB3aGVlbCAodG8gYXZvaWQgd2VpcmQgYm91bmNlIHdpdGggbW91c2Ugd2hlZWwpXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMudW5kZXJmbG93PWNlbnRlcl0gKHRvcC9ib3R0b20vY2VudGVyIGFuZCBsZWZ0L3JpZ2h0L2NlbnRlciwgb3IgY2VudGVyKSB3aGVyZSB0byBwbGFjZSB3b3JsZCBpZiB0b28gc21hbGwgZm9yIHNjcmVlblxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihwYXJlbnQsIG9wdGlvbnMpIHtcclxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gICAgICAgIHN1cGVyKHBhcmVudClcclxuICAgICAgICB0aGlzLm1vdmVkID0gZmFsc2VcclxuICAgICAgICB0aGlzLndoZWVsQWN0aXZlID0gZXhpc3RzKG9wdGlvbnMud2hlZWwpID8gb3B0aW9ucy53aGVlbCA6IHRydWVcclxuICAgICAgICB0aGlzLndoZWVsU2Nyb2xsID0gb3B0aW9ucy53aGVlbFNjcm9sbCB8fCAxXHJcbiAgICAgICAgdGhpcy5yZXZlcnNlID0gb3B0aW9ucy5yZXZlcnNlID8gMSA6IC0xXHJcbiAgICAgICAgdGhpcy5jbGFtcFdoZWVsID0gb3B0aW9ucy5jbGFtcFdoZWVsXHJcbiAgICAgICAgdGhpcy54RGlyZWN0aW9uID0gIW9wdGlvbnMuZGlyZWN0aW9uIHx8IG9wdGlvbnMuZGlyZWN0aW9uID09PSAnYWxsJyB8fCBvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ3gnXHJcbiAgICAgICAgdGhpcy55RGlyZWN0aW9uID0gIW9wdGlvbnMuZGlyZWN0aW9uIHx8IG9wdGlvbnMuZGlyZWN0aW9uID09PSAnYWxsJyB8fCBvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ3knXHJcbiAgICAgICAgdGhpcy5wYXJzZVVuZGVyZmxvdyhvcHRpb25zLnVuZGVyZmxvdyB8fCAnY2VudGVyJylcclxuICAgIH1cclxuXHJcbiAgICBwYXJzZVVuZGVyZmxvdyhjbGFtcCkge1xyXG4gICAgICAgIGNsYW1wID0gY2xhbXAudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgIGlmIChjbGFtcCA9PT0gJ2NlbnRlcicpIHtcclxuICAgICAgICAgICAgdGhpcy51bmRlcmZsb3dYID0gMFxyXG4gICAgICAgICAgICB0aGlzLnVuZGVyZmxvd1kgPSAwXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnVuZGVyZmxvd1ggPSAoY2xhbXAuaW5kZXhPZignbGVmdCcpICE9PSAtMSkgPyAtMSA6IChjbGFtcC5pbmRleE9mKCdyaWdodCcpICE9PSAtMSkgPyAxIDogMFxyXG4gICAgICAgICAgICB0aGlzLnVuZGVyZmxvd1kgPSAoY2xhbXAuaW5kZXhPZigndG9wJykgIT09IC0xKSA/IC0xIDogKGNsYW1wLmluZGV4T2YoJ2JvdHRvbScpICE9PSAtMSkgPyAxIDogMFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkb3duKGUpIHtcclxuICAgICAgICBpZiAodGhpcy5wYXVzZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBpc1dpZHRoU2NyZWVuID0gd2luZG93LmlubmVyV2lkdGggPiB3aW5kb3cuaW5uZXJIZWlnaHQ7XHJcbiAgICAgICAgY29uc3QgeCA9IGlzV2lkdGhTY3JlZW4gPyBlLmRhdGEuZ2xvYmFsLnggOiBlLmRhdGEuZ2xvYmFsLnk7XHJcbiAgICAgICAgY29uc3QgeSA9IGlzV2lkdGhTY3JlZW4gPyBlLmRhdGEuZ2xvYmFsLnkgOiBlLmRhdGEuZ2xvYmFsLng7XHJcbiAgICAgICAgaWYgKHRoaXMucGFyZW50LmNvdW50RG93blBvaW50ZXJzKCkgPT09IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXN0ID0geyB4LCB5IH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdCA9IG51bGxcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0IGFjdGl2ZSgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb3ZlZFxyXG4gICAgfVxyXG5cclxuICAgIG1vdmUoZSkge1xyXG4gICAgICAgIGlmICh0aGlzLnBhdXNlZCkge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMubGFzdCkge1xyXG4gICAgICAgICAgICBsZXQgaXNXaWR0aFNjcmVlbiA9IHdpbmRvdy5pbm5lcldpZHRoID4gd2luZG93LmlubmVySGVpZ2h0O1xyXG4gICAgICAgICAgICBjb25zdCB4ID0gaXNXaWR0aFNjcmVlbiA/IGUuZGF0YS5nbG9iYWwueCA6IGUuZGF0YS5nbG9iYWwueTtcclxuICAgICAgICAgICAgY29uc3QgeSA9IGlzV2lkdGhTY3JlZW4gPyBlLmRhdGEuZ2xvYmFsLnkgOiBlLmRhdGEuZ2xvYmFsLng7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gdGhpcy5wYXJlbnQuY291bnREb3duUG9pbnRlcnMoKVxyXG4gICAgICAgICAgICBpZiAoY291bnQgPT09IDEgfHwgKGNvdW50ID4gMSAmJiAhdGhpcy5wYXJlbnQucGx1Z2luc1sncGluY2gnXSkpIHtcclxuICAgICAgICAgICAgICAgIGxldCBkaXN0WCA9IHggLSB0aGlzLmxhc3QueFxyXG4gICAgICAgICAgICAgICAgbGV0IGRpc3RZID0geSAtIHRoaXMubGFzdC55XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5tb3ZlZCB8fCAoKHRoaXMueERpcmVjdGlvbiAmJiB0aGlzLnBhcmVudC5jaGVja1RocmVzaG9sZChkaXN0WCkpIHx8ICh0aGlzLnlEaXJlY3Rpb24gJiYgdGhpcy5wYXJlbnQuY2hlY2tUaHJlc2hvbGQoZGlzdFkpKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy54RGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LnggKz0gZGlzdFhcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMueURpcmVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC55ICs9IGRpc3RZXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdCA9IHsgeCwgeSB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLm1vdmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LmVtaXQoJ2RyYWctc3RhcnQnLCB7IHNjcmVlbjogdGhpcy5sYXN0LCB3b3JsZDogdGhpcy5wYXJlbnQudG9Xb3JsZCh0aGlzLmxhc3QpLCB2aWV3cG9ydDogdGhpcy5wYXJlbnQgfSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlZCA9IHRydWVcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC5kaXJ0eSA9IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZWQgPSBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHVwKCkge1xyXG4gICAgICAgIGNvbnN0IHRvdWNoZXMgPSB0aGlzLnBhcmVudC5nZXRUb3VjaFBvaW50ZXJzKClcclxuICAgICAgICBpZiAodG91Y2hlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgY29uc3QgcG9pbnRlciA9IHRvdWNoZXNbMF1cclxuICAgICAgICAgICAgaWYgKHBvaW50ZXIubGFzdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0ID0geyB4OiBwb2ludGVyLmxhc3QueCwgeTogcG9pbnRlci5sYXN0LnkgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubW92ZWQgPSBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh0aGlzLmxhc3QpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubW92ZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LmVtaXQoJ2RyYWctZW5kJywgeyBzY3JlZW46IHRoaXMubGFzdCwgd29ybGQ6IHRoaXMucGFyZW50LnRvV29ybGQodGhpcy5sYXN0KSwgdmlld3BvcnQ6IHRoaXMucGFyZW50IH0pXHJcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3QgPSB0aGlzLm1vdmVkID0gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB3aGVlbChkeCwgZHkpIHtcclxuICAgICAgICBpZiAodGhpcy5wYXVzZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy53aGVlbEFjdGl2ZSkge1xyXG4gICAgICAgICAgICBjb25zdCB3aGVlbCA9IHRoaXMucGFyZW50LnBsdWdpbnNbJ3doZWVsJ11cclxuICAgICAgICAgICAgaWYgKCF3aGVlbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYXJlbnQueCArPSBkeCAqIHRoaXMud2hlZWxTY3JvbGwgKiB0aGlzLnJldmVyc2VcclxuICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LnkgKz0gZHkgKiB0aGlzLndoZWVsU2Nyb2xsICogdGhpcy5yZXZlcnNlXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jbGFtcFdoZWVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGFtcCgpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC5lbWl0KCd3aGVlbC1zY3JvbGwnLCB0aGlzLnBhcmVudClcclxuICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LmRpcnR5ID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXN1bWUoKSB7XHJcbiAgICAgICAgdGhpcy5sYXN0ID0gbnVsbFxyXG4gICAgICAgIHRoaXMucGF1c2VkID0gZmFsc2VcclxuICAgIH1cclxuXHJcbiAgICBjbGFtcCgpIHtcclxuICAgICAgICBjb25zdCBvb2IgPSB0aGlzLnBhcmVudC5PT0IoKVxyXG4gICAgICAgIGNvbnN0IHBvaW50ID0gb29iLmNvcm5lclBvaW50XHJcbiAgICAgICAgY29uc3QgZGVjZWxlcmF0ZSA9IHRoaXMucGFyZW50LnBsdWdpbnNbJ2RlY2VsZXJhdGUnXSB8fCB7fVxyXG4gICAgICAgIGlmICh0aGlzLmNsYW1wV2hlZWwgIT09ICd5Jykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wYXJlbnQuc2NyZWVuV29ybGRXaWR0aCA8IHRoaXMucGFyZW50LnNjcmVlbldpZHRoKSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMudW5kZXJmbG93WCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgLTE6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LnggPSAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC54ID0gKHRoaXMucGFyZW50LnNjcmVlbldpZHRoIC0gdGhpcy5wYXJlbnQuc2NyZWVuV29ybGRXaWR0aClcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC54ID0gKHRoaXMucGFyZW50LnNjcmVlbldpZHRoIC0gdGhpcy5wYXJlbnQuc2NyZWVuV29ybGRXaWR0aCkgLyAyXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob29iLmxlZnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC54ID0gMFxyXG4gICAgICAgICAgICAgICAgICAgIGRlY2VsZXJhdGUueCA9IDBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG9vYi5yaWdodCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LnggPSAtcG9pbnQueFxyXG4gICAgICAgICAgICAgICAgICAgIGRlY2VsZXJhdGUueCA9IDBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5jbGFtcFdoZWVsICE9PSAneCcpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucGFyZW50LnNjcmVlbldvcmxkSGVpZ2h0IDwgdGhpcy5wYXJlbnQuc2NyZWVuSGVpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMudW5kZXJmbG93WSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgLTE6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LnkgPSAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC55ID0gKHRoaXMucGFyZW50LnNjcmVlbkhlaWdodCAtIHRoaXMucGFyZW50LnNjcmVlbldvcmxkSGVpZ2h0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50LnkgPSAodGhpcy5wYXJlbnQuc2NyZWVuSGVpZ2h0IC0gdGhpcy5wYXJlbnQuc2NyZWVuV29ybGRIZWlnaHQpIC8gMlxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKG9vYi50b3ApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC55ID0gMFxyXG4gICAgICAgICAgICAgICAgICAgIGRlY2VsZXJhdGUueSA9IDBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG9vYi5ib3R0b20pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBhcmVudC55ID0gLXBvaW50LnlcclxuICAgICAgICAgICAgICAgICAgICBkZWNlbGVyYXRlLnkgPSAwXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iXX0=