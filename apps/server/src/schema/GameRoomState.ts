import { MapSchema, Schema, type } from "@colyseus/schema"

class Vector3 extends Schema {
  @type("number") x = 0
  @type("number") y = 0
  @type("number") z = 0
}

class Quaternion extends Schema {
  @type("number") x = 0
  @type("number") y = 0
  @type("number") z = 0
  @type("number") w = 1
}

export class Player extends Schema {
  @type("string") id: string
  @type(Vector3) position = new Vector3()
  @type(Quaternion) rotation = new Quaternion()
  @type("string") animation = "idle"

  constructor(id: string) {
    super()
    this.id = id
  }
}

export class Projectile extends Schema {
  @type("string") id: string
  @type(Vector3) position = new Vector3()
  @type(Vector3) direction = new Vector3()
  @type("string") color = "white" // Initialize with a default value
  @type("string") ownerId: string
  @type("number") timestamp: number

  constructor(id: string, ownerId: string) {
    super()
    this.id = id
    this.ownerId = ownerId
    this.timestamp = Date.now()
  }
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>()
  @type({ map: Projectile }) projectiles = new MapSchema<Projectile>()
}

