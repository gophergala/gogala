package lib

import (
	"log"

	"golang.org/x/net/websocket"
)

// var clients = make(make[string]data.Client)

func SocketHandler(ws *websocket.Conn) {
	// Main loop

	// Register client

	registerClient()
}

func registerClient() {
	log.Printf("Im registering the client")
}
