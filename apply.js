var PseudoAudioParam = require('pseudo-audio-param')

module.exports = ApplyParam

var nextId = 0

function ApplyParam (context, target, param) {
  var id = nextId++
  var release = null
  var currentTime = context.audio.currentTime
  var fallback = null
  if (!target.getValueAtTime) {
    var audioParam = new PseudoAudioParam()
    audioParam.applyTo(target)
    fallback = target
    target = audioParam
  }

  var maxSchedule = 0

  if (param.onSchedule) {
    release = param.onSchedule(schedule)
    if (param.getValueAt) {
      send('setValueAtTime', [
        param.getValueAt(currentTime),
        currentTime]
      )
    }
  } else if (typeof param === 'function') {
    release = param(schedule)
    send('setValueAtTime', [
      param(),
      currentTime
    ])
  }

  return release

  // scoped

  function send (method, args) {
    if (fallback) {
      fallback[method].apply(fallback, args)
    }
    target[method].apply(target, args)
  }

  function schedule (descriptor) {
    if (!(descriptor instanceof Object)) {
      descriptor = { value: descriptor, at: context.audio.currentTime, duration: 0.1, mode: 'log' }
    }

    var toTime = descriptor.at + (descriptor.duration || 0)
    var fromTime = Math.max(descriptor.at, context.audio.currentTime)
    toTime = Math.max(fromTime, toTime)

    var fromValue = descriptor.fromValue != null
      ? descriptor.fromValue
      : target.getValueAtTime(fromTime)

    var toValue = descriptor.value

    if (descriptor.mode === 'cancel') {
      send('cancelScheduledValues', [fromTime])
    } else {
      if (maxSchedule > fromTime) {
        send('cancelScheduledValues', [fromTime])
        maxSchedule = fromTime
      }

      if (isFinite(fromValue) && (typeof descriptor.fromValue === 'number' || descriptor.mode !== 'log') && descriptor.mode !== 'curve') {
        send('setValueAtTime', [fromValue, fromTime])
      }

      if (descriptor.mode === 'curve') {
        send('setValueCurveAtTime', [toValue, fromTime, descriptor.duration || 0.0001])
      } else if (descriptor.duration) {
        if (descriptor.mode === 'exp') {
          send('exponentialRampToValueAtTime', [toValue, toTime])
        } else if (descriptor.mode === 'log') {
          send('setTargetAtTime', [toValue, fromTime, descriptor.duration / 8])
        } else {
          send('linearRampToValueAtTime', [toValue, toTime])
        }
      } else {
        send('setValueAtTime', [toValue, fromTime])
      }
    }

    if (maxSchedule < toTime) {
      maxSchedule = toTime
    }
  }
}
