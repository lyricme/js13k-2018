const svg = document.querySelector('svg')
const KEYS = {}
const WIDTH = 768
const HEIGHT = 480
const NO_DEFAULT = [
  ' ',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight'
]

const sleep = (delay) => new Promise((resolve, reject) => {
  let start = performance.now()
  requestAnimationFrame(function check (now) {
    if (now >= start + delay) return resolve()
    requestAnimationFrame(check)
  })
})

document.addEventListener('keydown', (event) => {
  KEYS[event.key] = true
  if (event.key === ' ') scene.on = !scene.on
  if (NO_DEFAULT.includes(event.key)) event.preventDefault()
})

document.addEventListener('keyup', (event) => {
  KEYS[event.key] = false
})

class Body {
  get top () {
    return this.y
  }

  get bottom () {
    return this.y + this.height
  }

  get left () {
    return this.x
  }

  get right () {
    return this.x + this.width
  }

  set bottom (value) {
    this.y = value - this.height
  }
}

class Goal extends Body {
  constructor () {
    super()
    this.element = document.getElementById('goal')
    this.x = 0
    this.y = 0
    this.width = 22
    this.height = 20
  }

  get x () {
    return this._x
  }

  set x (value) {
    this.element.setAttribute('x', this._x = value)
  }

  get y () {
    return this._y
  }

  set y (value) {
    this.element.setAttribute('y', this._y = value)
  }
}

class Guy extends Body {
  constructor (x, y) {
    super()
    this.element = document.getElementById('guy')
    this.x = x
    this.y = y
    this.height = 48
    this.width = 26
    this.speed = 7
    this.vx = 0
    this.vy = 0
  }

  get x () {
    return this._x
  }

  set x (value) {
    this.element.setAttribute('x', this._x = value)
  }

  get y () {
    return this._y
  }

  set y (value) {
    this.element.setAttribute('y', this._y = value)
  }

  tick () {
    if (KEYS.ArrowLeft && !KEYS.ArrowRight) {
      this.vx = -this.speed
      this.element.classList.add('left')
    } else if (KEYS.ArrowRight && !KEYS.ArrowLeft) {
      this.vx = this.speed
      this.element.classList.remove('left')
    } else {
      this.vx = 0
    }

    this.element.classList.toggle('walk', KEYS.ArrowLeft || KEYS.ArrowRight)
  }
}

class Bar extends Body {
  constructor (x, y, width, height, on, spike) {
    super()
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.on = on
    this.spike = spike
    this.element = document.createElementNS(svg.namespaceURI, 'rect')
    this.element.setAttribute('x', this.x)
    this.element.setAttribute('y', this.y)
    this.element.setAttribute('width', this.width)
    this.element.setAttribute('height', this.height)
    this.element.classList.toggle('light', on)
    this.element.classList.toggle('dark', !on)
    if (this.spike) {
      this.element.setAttribute('fill', `url(#spike-${this.spike})`)
    }
  }
}

class Scene {
  constructor (levels) {
    this.index = 0
    this.deaths = 0
    this.paused = false
    this.guy = new Guy
    this.goal = new Goal
    this.levels = levels
    this.load(...levels[0])
  }

  get on () {
    return this._on
  }

  set on (value) {
    this._on = value
    document.body.classList.toggle('on', value)
    document.body.classList.toggle('off', !value)
  }

  get deaths () {
    return this._deaths
  }

  set deaths (value) {
    this._deaths = value
    const counter = document.getElementById('counter')
    counter.innerHTML = ''
    let s = value.toString()
    for (let i = 0; i < s.length; i++) {
      const rect = document.createElementNS(svg.namespaceURI, 'rect')
      rect.setAttribute('fill', `url(#n${s[i]})`)
      rect.setAttribute('width', 10)
      rect.setAttribute('height', 16)
      rect.setAttribute('x', 12 * i)
      counter.appendChild(rect)
    }
  }

  async advance () {
    this.paused = true
    document.body.classList.add('finish')
    await sleep(1000)
    this.index = Math.min(this.index + 1, this.levels.length - 1)
    this.load(...this.levels[this.index])
    document.body.classList.remove('finish')
    await sleep(1000)
    this.paused = false
  }

  async death () {
    this.deaths += 1
    this.paused = true
    const death = document.getElementById('death')
    death.setAttribute('x', this.guy.x - 32 + this.guy.width / 2)
    death.setAttribute('y', this.guy.y - 32 + this.guy.height / 2)
    this.guy.element.setAttribute('hidden', true)
    document.body.classList.add('dying')
    await sleep(700)
    document.body.classList.remove('dying')
    this.reset()
    this.guy.element.removeAttribute('hidden')
    this.paused = false
  }

  load (guy, goal, bars) {
    this.start = guy
    const [x, y] = goal
    this.goal.x = x
    this.goal.y = y
    if (this.bars) for (const bar of this.bars) bar.element.remove()
    this.bars = bars.map((args) => new Bar(...args))
    for (const bar of this.bars) svg.appendChild(bar.element)
    this.reset()
  }

  reset () {
    this.on = true
    const [x, y] = this.start
    this.guy.x = x
    this.guy.y = y
  }

  standing () {
    return this.bars.some((bar) =>
      !bar.spike &&
      bar.on === this.on &&
      this.guy.left <= bar.right &&
      this.guy.right >= bar.left &&
      this.guy.bottom === bar.top
    )
  }

  landing () {
    return this.bars.find((bar) =>
      !bar.spike &&
      bar.on === this.on &&
      this.guy.left <= bar.right &&
      this.guy.right >= bar.left &&
      this.guy.bottom < bar.top &&
      this.guy.bottom + this.guy.vy >= bar.top
    )
  }

  won () {
    return (
      this.guy.left <= this.goal.right &&
      this.guy.right >= this.goal.left &&
      this.guy.top <= this.goal.bottom &&
      this.guy.bottom >= this.goal.top
    )
  }

  lost () {
    return this.guy.bottom > HEIGHT || this.bars.some((bar) =>
      bar.spike &&
      bar.on ===  this.on &&
      this.guy.left <= bar.right &&
      this.guy.right >= bar.left &&
      this.guy.top <= bar.bottom &&
      this.guy.bottom >= bar.top
    )
  }

  tick () {
    if (this.paused) return

    if (KEYS.ArrowUp && this.standing()) {
      this.guy.vy = -21
    }

    if (this.landing()) {
      this.guy.bottom = this.landing().y
      this.guy.vy = 0
    }

    this.guy.tick()

    const onRight = this.bars.reduce((min, bar) => {
      if (bar.on !== this.on) return min
      if (bar.left < this.guy.right) return min
      if (bar.top > this.guy.bottom) return min
      if (bar.bottom < this.guy.top) return min
      return Math.min(min, bar.left - this.guy.right)
    }, WIDTH - this.guy.right)

    const onLeft = this.bars.reduce((max, bar) => {
      if (bar.on !== this.on) return max
      if (bar.right > this.guy.left) return max
      if (bar.top > this.guy.bottom) return max
      if (bar.bottom < this.guy.top) return max
      return Math.max(max, bar.right - this.guy.left)
    }, -this.guy.left)

    const onTop = this.bars.reduce((max, bar) => {
      if (bar.on !== this.on) return max
      if (bar.bottom > this.guy.top) return max
      if (bar.left > this.guy.right) return max
      if (bar.right < this.guy.left) return max
      return Math.max(max, bar.bottom - this.guy.top)
    }, -this.guy.top)

    this.guy.x = this.guy.x + Math.max(onLeft, Math.min(this.guy.vx, onRight))
    this.guy.y = this.guy.y + Math.max(onTop, this.guy.vy)

    if (!this.standing()) {
      this.guy.vy = Math.min(10, this.guy.vy + 2)
    }

    if (this.lost()) this.death()

    if (this.won()) this.advance()
  }
}

const scene = new Scene([
  [[24, 200], [724, 244], [
    [0, 288, 330, 600, true],
    [438, 288, 330, 600, true]
  ]],
  [[371, 20], [724, 404], [
    [0, 100, 768, 16, true],
    [0, 216, 768, 16, false],
    [0, 332, 768, 16, true],
    [0, 448, 768, 600, false]
  ]],
  [[24, 200], [724, 244], [
    [0, 288, 330, 600, true],
    [438, 288, 330, 600, false]
  ]],
  [[24, 255], [724, 268], [
    [0, 312, 768, 8, true],
    [0, 312, 768, 8, true],
    [380, 0, 8, 312, true],
    [0, 408, 768, 600, false]
  ]],
  [[116, 240], [628, 412], [
    [64, 448, 128, 32, false],
    [320, 448, 128, 32, true],
    [576, 448, 128, 32, false]
  ]],
  [[24, 392], [604, 152], [
    [0, 448, 768, 32, true],
    [128, 320, 512, 8, true],
    [632, 328, 8, 120, true],
    [128, 192, 512, 8, true],
    [128, 200, 8, 120, true],
    [640, 384, 128, 8, false],
    [0, 256, 128, 8, false],
  ]],
  [[24, 200], [724, 244], [
    [0, 288, 768, 600, true],
    [320, 0, 128, 288, true]
  ]],
  [[24, 255], [704, 84], [
    [0, 416, 244, 600, true],
    [524, 128, 244, 600, true],
    [288, 320, 64, 600, false],
    [416, 224, 64, 600, false]
  ]],
  [[48, 350], [696, 384], [
    [48, 432, 24, 24, true],
    [156, 348, 24, 24, false],
    [48, 264, 24, 24, true],
    [156, 180, 24, 24, false],
    [264, 180, 24, 24, true],
    [372, 180, 24, 24, false],
    [480, 180, 24, 24, true],
    [588, 180, 24, 24, false],
    [696, 264, 24, 24, true],
    [588, 348, 24, 24, false],
    [696, 432, 24, 24, true]
  ]],
  [[371, 380], [372, 20], [
    [320, 440, 128, 8, true],
    [320, 448, 128, 8, true, 'down'],
    [320, 344, 128, 8, false],
    [320, 352, 128, 8, false, 'down'],
    [320, 248, 128, 8, true],
    [320, 256, 128, 8, true, 'down'],
    [320, 152, 128, 8, false],
    [320, 160, 128, 8, false, 'down'],
  ]],
  [[371, 20], [372, 372], [
    [336, 320, 96, 8, true],
    [336, 416, 96, 8, true],
    [336, 328, 8, 88, true],
    [424, 328, 8, 88, true],
    [336, 312, 96, 8, true, 'up']
  ]],
  [[371, 20], [584, 404], [
    [0, 144, 384, 8, true, 'up'],
    [0, 152, 384, 8, true],
    [0, 240, 464, 8, true, 'up'],
    [0, 248, 464, 8, true],
    [0, 336, 544, 8, true, 'up'],
    [0, 344, 544, 8, true],
  ]],
  [[371, 20], [372, 404], [
    [320, 384, 128, 8, true],
    [320, 376, 128, 8, true, 'up'],
    [320, 272, 128, 8, false],
    [320, 264, 128, 8, false, 'up'],
    [320, 168, 128, 8, true],
    [320, 160, 128, 8, true, 'up'],
  ]],
  [[400, 20], [372, 432], [
    [0, 144-48, 384, 8, true, 'up'],
    [0, 152-48, 384, 8, false, 'down'],
    [384, 240, 384, 8, true, 'up'],
    [384, 248, 384, 8, false, 'down'],
    [0, 336+48, 384, 8, true, 'up'],
    [0, 344+48, 384, 8, false, 'down'],
  ]],
  [[108, 183], [620, 192], [
    [80, 152, 80, 8, true, 'up'],
    [80, 160, 80, 4, true],
    [72, 160, 8, 80, true, 'left'],
    [80, 164, 4, 72, true],
    [160, 160, 8, 80, true, 'right'],
    [156, 164, 4, 72, true],
    [80, 240, 80, 8, true, 'down'],
    [80, 236, 80, 4, true],
    [208, 232, 80, 8, false, 'up'],
    [208, 240, 80, 4, false],
    [200, 240, 8, 80, false, 'left'],
    [208, 244, 4, 72, false],
    [288, 240, 8, 80, false, 'right'],
    [284, 244, 4, 72, false],
    [208, 320, 80, 8, false, 'down'],
    [208, 316, 80, 4, false],
    [336, 152, 80, 8, true, 'up'],
    [336, 160, 80, 4, true],
    [328, 160, 8, 80, true, 'left'],
    [336, 164, 4, 72, true],
    [416, 160, 8, 80, true, 'right'],
    [412, 164, 4, 72, true],
    [336, 240, 80, 8, true, 'down'],
    [336, 236, 80, 4, true],
    [464, 232, 80, 8, false, 'up'],
    [464, 240, 80, 4, false],
    [456, 240, 8, 80, false, 'left'],
    [464, 244, 4, 72, false],
    [544, 240, 8, 80, false, 'right'],
    [540, 244, 4, 72, false],
    [464, 320, 80, 8, false, 'down'],
    [464, 316, 80, 4, false],
    [592, 152, 80, 8, true, 'up'],
    [592, 160, 80, 4, true],
    [584, 160, 8, 80, true, 'left'],
    [592, 164, 4, 72, true],
    [672, 160, 8, 80, true, 'right'],
    [668, 164, 4, 72, true],
    [592, 240, 80, 8, true, 'down'],
    [592, 236, 80, 4, true]
  ]]
])

requestAnimationFrame(function tick () {
  scene.tick()
  requestAnimationFrame(tick)
})
