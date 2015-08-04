audio-slot-param
===

Link and transform schedule-based observables and connect to [AudioParams](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam) (Web Audio API).

Params are instances of [observ-node-array/single](https://github.com/mmckegg/observ-node-array/blob/master/single.js).

[![NPM](https://nodei.co/npm/audio-slot-param.png)](https://nodei.co/npm/audio-slot-param/)

## Example

```js
var Param = require('audio-slot-param')
var apply = require('audio-slot-param/apply')

var context = {
  audio: new AudioContext(), // Web Audio
  nodes: {
    lfo: require('audio-slot/modulators/lfo')
  }
}

var frequency = Param(context, 440)

var osc = audioContext.createOscillator()
var unapply = apply(context, osc.frequency, frequency)

osc.connect(context.audio.destination)
osc.start()

// set the value explicitly:
frequency.set(220)

// modulate with an LFO
frequency.set({
  node: 'lfo',
  mode: 'add',
  amp: 50,
  value: 220,
  rate: 8, // hz
  trigger: false
})
```

### Transforms

```js
var Transform = require('audio-slot-param/transform')

var pitch = Param(context, 0)
var octave = Param(context, 0)

var frequency = Transform(context, [ 440, // base freq
  { param: obs.octave, transform: transformOctave },
  { param: obs.noteOffset, transform: transformNote }
])

apply(context, osc.frequency, frequency)

octave.set(-1)
pitch.set(4)

osc.frequency.value //= 277.1826309768721

// or as above, we can specify a modulator instead of explicit value:
pitch.set({
  node: 'lfo',
  mode: 'add',
  amp: 1,
  value: 4,
  rate: 8, // hz
  trigger: false
})

function transformOctave(baseFrequency, value){
  return baseFrequency * Math.pow(2, value)
}

function transformNote(baseFrequency, value){
  return baseFrequency * Math.pow(2, value / 12)
}
```

### Param Proxy

Creates a placeholder param that can be swapped for a real param later.

```js
var Proxy = require('audio-slot-param/proxy')
var param = Proxy(context, 440)
apply(context, osc.frequency, param)

// then later on swap:
var target = LFO(context)
param.set(target)
```