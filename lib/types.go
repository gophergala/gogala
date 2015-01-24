package lib

import "golang.org/x/net/websocket"

type Message struct {
	// in: "format", "edit", "message", "info"
	Kind string
	Body string
	Args []interface{}
}

type Client struct {
	Id   string
	Name string
	Conn *websocket.Conn
}
