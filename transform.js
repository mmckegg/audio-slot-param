var Event = require('geval')
var PseudoAudioParam = require('pseudo-audio-param')
var apply = require('./apply')
var setImmediate = require('setimmediate2').setImmediate

module.exports = ParamTransform

function ParamTransform (context, params) {
  var releases = []
  var channels = []
  var transforms = []
  var values = []

  var rescheduling = false
  var scheduleFrom = context.audio.currentTime

  params.forEach(function (container, i) {
    if (container.onSchedule) {
      container = { param: container }
    } else if (!(container instanceof Object)) {
      container = { value: container }
    }

    if (container.param) {
      var param = container.param
      if (param.onSchedule) {
        var channel = channels[i] = new PseudoAudioParam()
        releases.push(apply(context, channel, param))
        releases.push(param.onSchedule(onSchedule))
      } else if (typeof param === 'function') {
        releases.push(param(onChange.bind(this, i)))
        values[i] = param()
      }
    } else if (container.value != null) {
      values[i] = container.value
    }

    if (container.transform) {
      transforms[i] = container.transform
    }
  })

  var broadcast = null

  return {
    onSchedule: Event(function (b) {
      broadcast = b
    }),

    getValueAt: function (time) {
      return getValueAt(time)
    },

    resend: function () {
      broadcast({
        value: getValueAt(context.audio.currentTime),
        at: context.audio.currentTime
      })
    },

    destroy: function () {
      while (releases.length) {
        releases.pop()()
      }
    }
  }

  // scoped
  function onSchedule (descriptor) {
    schedule(Math.max(context.audio.currentTime, descriptor.at))
  }

  function onChange (i, value) {
    values[i] = value
    schedule(context.audio.currentTime)
  }

  function schedule (from) {
    scheduleFrom = Math.max(context.audio.currentTime, Math.min(from, scheduleFrom))
    if (!rescheduling) {
      rescheduling = true
      setImmediate(doSchedule)
    }
  }

  function doSchedule () {
    rescheduling = false
    var endTime = Math.max(scheduleFrom, getEndTime())
    var duration = endTime - scheduleFrom

    var steps = Math.ceil(duration * context.audio.sampleRate / 100) || 1
    var stepTime = duration / steps
    var curve = new Float32Array(steps + 1)
    for (var i = 0; i < curve.length; i++) {
      var time = stepTime * i + scheduleFrom
      curve[i] = getValueAt(time)
    }

    broadcast({
      at: scheduleFrom,
      mode: 'curve',
      value: curve,
      duration: duration
    })

    scheduleFrom = endTime
  }

  function getValueAt (at) {
    var lastValue = 1
    for (var i = 0; i < params.length; i++) {
      var value = channels[i]
        ? channels[i].getValueAtTime(at)
        : values[i]
      if (transforms[i]) {
        lastValue = transforms[i](lastValue, value)
      } else {
        lastValue = value
      }
    }
    return lastValue
  }

  function getEndTime () {
    var maxTime = context.audio.currentTime
    for (var i = 0; i < params.length; i++) {
      if (channels[i] && channels[i].events) {
        var events = channels[i].events
        var lastEvent = events[events.length - 1]
        if (lastEvent) {
          var duration = lastEvent.timeConstant ? lastEvent.timeConstant * 8 : lastEvent.duration
          var endAt = lastEvent.time + (duration || 0)
          if (endAt > maxTime) {
            maxTime = endAt
          }
        }
      }
    }
    return maxTime
  }
}
