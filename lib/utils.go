package lib

func MakeArgs(a ...interface{}) []interface{} {
	args := make([]interface{}, 0)
	for _, v := range a {
		args = append(args, v)
	}
	return args
}
