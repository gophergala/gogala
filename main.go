package main

import (
	"flag"
	"log"
	"net/http"

	"github.com/julien/gogala/util"
)

var (
	listenAddr = flag.String("addr", "8000", "Listen address")
	debug      util.Debug
	verbose    bool
)

func init() {
	flag.BoolVar(&verbose, "verbose", true, "Debug mode")
}

func main() {
	flag.Parse()
	debug = util.Debug(verbose)

	http.Handle("/", indexHandler())
	http.Handle("/static/", util.GZipHandler(util.CacheHandler(30, staticHandler())))

	debug.Printf("Listening on: %s\n", *listenAddr)

	log.Fatal(http.ListenAndServe(":8080", nil))
}

func indexHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/static/", http.StatusMovedPermanently)
	})
}

func staticHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, r.URL.Path[1:])
	})
}
