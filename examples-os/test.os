﻿/*
TestObj = {
	
	__construct = function(value){
		@value = value
	},
	
	valueOf = function(){
		return "to-"..@value
	},
	
	__add = function(b){
		numberOf(b) && return TestObj(@value + b);
		b is TestObj && return TestObj(@value + b.value);
		throw "expect number or TestObj argument"
	},
	__radd = function(b){
		numberOf(b) && return TestObj(b + @value);
		throw "expect number"
	},

	__sub = function(b){
		numberOf(b) && return TestObj(@value - b);
		b is TestObj && return TestObj(@value - b.value);
		throw "expect number or TestObj argument"
	},
	__rsub = function(b){
		numberOf(b) && return TestObj(b - @value);
		throw "expect number"
	},
}

var a = TestObj(10)
var b = TestObj(13)
var c = TestObj(3)
var d = a + b - c
print("${a} + ${b} - ${c} = ${d}")

terminate()
*/

print { 
	dirname = path.dirname(__FILE__),
	basename = path.basename(__FILE__),
	extname = path.extname(__FILE__),
	resolve = path.resolve("test-sqlite.db"),
}

;{
	var a = 6
	var b = 1
	var c = !!(a & b)
	print c
}

echo("file: ${__FILE__}, line: ${__LINE__}\n")

print(5, " differences")

;{
	var i = 4
	// multiple assignment
	var name, count, time = "Smith", 3 + 2/i, 1.23
	print "name: ${name}, count: ${count}, time: ${time}"
}

// auto call function with single argument, brackets are not used
print {firstname="Ivan", lastname="Petrov"}

;{
	// extended object constructor syntax
	var a = {x=1, y=3; "zero", "one", "two"; last:7,}
	print a[1]
	print a
	
	// extended object constructor syntax
	a = {[2+3]="five", y=3}
	print a[5]
	print a
	
	a = {x=1, y=2}
	// any type could be used as index
	var b = {[a]="powerful", 7="greate"}
	print b[a]	
	
	print([10, 20, 30, 40])
	
	// multiple assignment
	var i, j, k = 0, 1, 3
	print "i=${i}, j=${j}, k=${k}"
	
	// swap using multiple assignment
	i, j = j, i
	print "after swap: i=${i}, j=${j}"
	
	// multiple returns
	var test = function(){ return 1, 2 }
	var a, b = test()
	print("results from function", "a="..a, "b="..b)
	
	// multiple returns
	var a, b, c = test()
	print("results from function", "a="..a, "b="..b, "c="..c)
}

;{
	print "Object iterator test"
	var obj = { null, awesome=true, 12, "excellent" }
	for(var k, v in obj){
		print "${k} --> ${v}"
	}

	print "Object iterator test, only keys"
	for(k in obj){
		print k
	}
	
	print "Array iterator test"
	Array.__iter = function(){
		var i, self = 0, this
		return function(){
			if(i < #self){
				print "... inside of array iter func: ${i} ${self[i]}"
				return true, i, self[i++]
			}
		}
	}	
	for(k, v in [10, 20, 30, 40, 50]){
		print "${k} --> ${v}"
	}
	
	print("Test array prototype:", [1, 2, 3].prototype === Array)
	
	print "Test range iterator"
	var range = function(a, b){
		return function(){
			if(a <= b){
				return true, a++
			}
		}
	}
	for(var i in range(10, 13)){
		print "i = "..i
	}	
}

// logical operators
print "7 && 9 = "..(7 && 9)
print "7 || 9 = "..(7 || 9)

// ========================================================

;{
	var v1 = {x=1, y=2}
	var a = {[v1]="vv1", v2="vv2"}
	print(a[v1], a.v2)
}
// ========================================================

// class declaration
var Person = {
    __construct = function(firstname, lastname){
        @firstname = firstname // equal to this.firstname = firstname
        @lastname = lastname // equal to this.lastname = lastname
    },
    walk = function(){
        print "${@fullname} is walking!"
    },
    __get@fullname = function(){
        return "${@firstname} ${@lastname}"
    },
}
// create new instance of Person class
var p = Person("James", "Bond")
p.walk()
print p
print "p is Person = " .. (p is Person)

// inherit class
var IvanPerson = extends Person {
    __construct = function(){
        super("Ivan", "Petrov")
    },
	walk = function(){
		echo "Someone named "
		super()
	},
}

// create new instance of IvanPerson class
var p = IvanPerson()
p.walk()
print p

print "Person.walk.call"
Person.walk.call(p)

// ========================================================

function foo(a, b){ return a + b }
function bar(){ return foo.apply(null, arguments) }
print "should be 5: ${bar(2, 3)}"
print "should be 9: ${bar(4, 5)}"

// ========================================================
// new vector type class
var vec3 = {
    __construct = function(x, y, z){ 
		@z, @y, @x = z, y, x 
	},
    __add = function(b){ 
		vec3(@x + b.x, @y + b.y, @z + b.z) 
	},
    __mul = function(b){ 
		vec3(@x * b.x, @y * b.y, @z * b.z) 
	},
}

var v1 = vec3(10, 20, 30)
var v2 = vec3(1, 2, 3)
var v3 = v1 + v2 * v2
print "should be {x:11,y:24,z:39} " .. v3

;{
	print "Test properties"

	var a = {
		_color = "red",
		__get@color = {|| @_color },
		__set@color = {|v| @_color = v },
	}
	
	// get property
	print "should be red: " .. a["color"]
	// set property
	a.color = "blue"
	print "should be blue: " .. a.color

	a = {
		_color = "white",
		__get = function(name){ 
			if(name == "color")
				return this._color 
		},
		__set = function(name, v){
			if(name == "color")
				this._color = v
		},
		__del = function(name){
			if(name == "color")
				delete this._color
		},
	}
	
	// get property
	print "should be white: " .. a.color
	print "should be null: " .. a.color2
	// set property
	a.color = "green"
	print "should be green: " .. a.color
	// delete property
	delete a.color

	print "should be null: " .. a.color	
	print "Test multi dimensional properties"
	
	a = {
		_matrix = {},
		__getdim = function(x, y){
			return this._matrix[y*4 + x]
		},
		__setdim = function(value, x, y){
			this._matrix[y*4 + x] = value
		},
		__deldim = function(x, y){
			delete this._matrix[y*4 + x]
		},
	}
	// set property
	a[1, 2] = 5		// a.__setdim(5, 1, 2)
	// get property
	print "should be 5: " .. a[1, 2]	// print(a.__getdim(1, 2))
	// delete property
	delete a[1, 2]	// a.__deldim(1, 2)
	print "should be null: " .. a[1, 2]	// print(a.__getdim(1, 2))	
}


print "Test function inline call"
print "should be 7: " .. {|a, b, c| a + b * c }(1, 2, 3)

;{
	print "Test local vars scope"
	var i = 1;
	{
		var i = i
		i++
		print i
	}
	print i
}

print "Test debuglocals"
function(a){
	var c = a * 2;
	{
		var c = a - 1
		print debuglocals
	}
}(10)

print "Script environment"
print _E

print "Math functions"
var a = [math.random(), math.random(), math.random(), math.random(), math.random(), math.random()]
print("random", a)

// remove debug print from Array.__iter
delete Array.__iter // delete our iterator, use default one

function Object.map(func){
	var r = {}
	for(var i, v in this) r[i] = func(v)
	return r
}

function Array.map(func){
	var r = []
	for(var i, v in this) r[i] = func(v)
	return r
}

a = a.map {|a| a*100}
print("mult 100", a)
print("math.ceil", a.map(math.ceil))
print("math.floor", a.map(math.floor))
print("math.round(-1)", a.map{|a| math.round(a, -1)})
print("math.round(2)", a.map{|a| math.round(a, 2)})
print("math.sin", a.map(math.sin))
print("math.cos", a.map(math.cos))
print("math.tan", a.map(math.tan))

_E = math
print "Extend local environment to be able to use math module without namespace"
print("round(3)", a.map{|a| round(a, 3)})
print("PI", PI)

var core = require("core")
print("core.eval(math.round(13.5))", core.eval("math.round(13.5)"))
print("eval(math.round(13.5))", eval("math.round(13.5)"))
print("==============")
print("Next: math namespace is not used\nbut eval executes code in global environment by default\nso eval(round(13.5))", eval("round(13.5)"))
print("run eval in space of the current environment (round(13.5))", eval("round(13.5)", _E))

var __planet = "Mars"
function get planet(){ return __planet }
function set planet(a){ __planet = a }

print "Planet should be Mars: "..planet
planet = "Mercury"
print "Planet should be Mercury: "..planet

function compareValues(a, b){
	var x, y = numberOf(a), numberOf(b)
	x && y && return x <=> y
	x, y = stringOf(a), stringOf(b)
	x && y && return x <=> y
	return a <=> b
}

function Object.__getdim(i, count){
	return this.sub(i, count)
}

function String.__get(i){
	return this.sub(i, 1)
}

print "Sorted array"
print([9, 4, 0, 276, 15, 39, 3].sort())

function Object.do(func){
	func.call(this)
	return this
}

print "User sorted array by keys"
print([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].do {||
	var keys = this.keys.sort{|a, b| (a % 3) <=> (b % 3)}
	var values = this.clone()
	for(var k, v in keys){
		this[v] = values[v]
	}
})

print "Sorted array (reverse)"
print([9, 4, 0, 276, 15, 39, 3].sort{|a, b| b <=> a})

print "User sorted array"
print([9, 4, 0, 276, 15, 39, 3].sort{|a, b| (a % 10) <=> (b % 10)})

print "Sorted object by values"
print({b=9, 4, d=0, c=276, 15, a=39, 3}.sort())

print "Sorted object by values (reverse)"
print({b=9, 4, d=0, c=276, 15, a=39, 3}.sort{|a, b| b <=> a})

print "Sorted object by keys"
print({b=9, 4, d=0, c=276, 15, a=39, 3}.sort{|a, b, ka, kb| compareValues(ka, kb) })

print "Sorted object by keys (reverse)"
print({b=9, 4, d=0, c=276, 15, a=39, 3}.sort{|a, b, ka, kb| compareValues(kb, ka) })

function printBackTrace(skipNumFuncs){
	for(var i, t in debugBackTrace(skipNumFuncs + 1)){ // skip printBackTrace
		printf("#%d %s%s: %s, args: %s\n", i, t.file,
			t.line > 0 ? "(${t.line},${t.pos})" : "",
			t.object !== _G && t.object ? "{obj-${t.object.__id}}.${t.__name}" : t.__name, t.arguments)
	}
}

try{
	print "simulate exception..."
	var a, b = 2, 0
	var c = a / b
}catch(e){
	print "exception: ${e.message}"
	for(var i, t in e.trace){
		printf("#%d %s%s: %s, args: %s\n", i, t.file,
			t.line > 0 ? "(${t.line},${t.pos})" : "",
			t.object !== _G && t.object ? "{obj-${t.object.__id}}.${t.__name}" : t.__name, t.arguments)
	}
	// throw e
}

var function testFunc(arg1, arg2){
	var testFunc2 = {|arg1, arg2, arg3|
		var testFunc3 = {|arg1|
			printBackTrace()
			var i = 0 // add some code at the end of function to prevent tail call
		}
		testFunc3(1, 2)
		var i = 0 // add some code at the end of function to prevent tail call
	}
	testFunc2(1, 2)
	var i = 0 // add some code at the end of function to prevent tail call
}
print "Test back trace"
testFunc(1, 2)
// terminate()

print "Test 5 < 10 ? 7 : 3 --> "..(5 < 10 ? 7 : 3)
print "Test in operator (should be true) "..("name" in {x = 0, y = 0, name = 0, index = 0})

print "Test _F and recursion"
print "factorial(20) = " .. {|a| a <= 1 ? 1 : a*_F(a-1)}(20)

function Object.each(func){
	for(var k, v in this){
		func(k, v)
	}
}

[10, 20, 30, 40].each {|i, a|
	print a
}

/*
	formats:
	%v - default depends on argument type
	%s - string
	%c - char (the first char of string)
	%d, %i - integer, base 10
	%o - integer, base 8
	%b - integer, base 2
	%x, %X - integer, base 16
	%n - default number format, human friendly
	%e - scientific notation, e.g. -1234.456e+78
	%E - scientific notation, e.g. -1234.456E+78
	%f - decimal point but no exponent, e.g. 123.456
	%g - whichever of %e or %f produces more compact output
	%G - whichever of %E or %f produces more compact output
*/

printf("def: %v, decimal: %d, string: %s, def:%v\n", "John", 123.45678, 123.45678, 123.45678)
printf("number: %n, float: %f, float(%%.2f): %.2f, float(%%.-1f): %.-1f\n", math.round(123.45678, 2), math.round(123.45678, 2), 123.45678, 123.45678)
printf("%s\n", sprintf("number: %n, float(%%.-2f): %.-2f", 12876.54321, 12876.54321))

;{
	print "Buffer usage"
	var buf = Buffer(123, "abc", "def")
	buf.append(4.5, "-append")
	buf.printf("-%v\n", 123.4567)
	str = toString(buf)
	print str
}

;{
	print "File usage"
	var f = File(__FILE__, "rb")
	str = f.read(100)
	f.close()
	print str
}

function Number.times(func){
	for(var i = 0; i < this; i++){
		func(i)
	}
}
print "Test 10.times"
10.times{|i| print i }

Range = {
	__construct = function(a, b){
		if(b){
			@a, @b = a, b
		}else{
			@a, @b = 0, a - 1
		}
	},
	__iter = function(){
		var a, b = @a, @b
		return a <= b 
			? {|| a <= b && return true, a++ } 
			: {|| a >= b && return true, a-- }
	},
}

print "Test for in Range(5)"
for(var i in Range(5))
	print i

print "Test for in Range(-2, -6)"
for(var i in Range(-2, -6))
	print i

function Number.to(b){
	return Range(this, b)
}

print "Test for in 5.to(7)"
for(var i in 5.to(7))
	print i

print "Test 7.to(2).each"
7.to(2).each{|i| print i}

if(false && "Curl" in _G){
	print "Test CURL callbacks"
	require "curl/test_callbacks.os"

	print "Test CURL getinfo"
	require "curl/test_getinfo.os"
}else{
	print "Curl library is not enabled"
}

if("SqliteConnection" in _G){
	print "Test sqlite database"
	var conn = SqliteConnection(path.resolve("test-sqlite.db"))
	
	print "Test insert sql"
	conn.execute("insert into session_log (user_id, time, ip, user_agent, referrer) values(:user_id, :time, :ip, :user_agent, :referrer)", {
		user_id = 10,
		time = "2013-04-01 10:00",
		ip = "127.0.01",
		user_agent = "Test user agent: ${math.round(math.random() * 100)}",
		referrer = "http://ya.ru",
	})
	print "lastInsertId: ${conn.lastInsertId}"
	
	var stmt = conn.query("select * from session_log where user_id > :user_id", {
		user_id = 2
	})
	for(var i, row in stmt){
		print row
	}
}else{
	print "Sqlite3 library is not enabled"
}

if("ODBO" in _G){
	// print DateTime(2013, 10, 20, 10, 15, 45)
	
	print "Test ODBO extension"
	var conn = ODBO("mysql", {
		user = "root",
		// password = "",
		dbname = "test"
	})
	
	var stmt = conn.query("select * from tbl_user where id > :id", {
		id = 2
	})
	for(var i, row in stmt){
		print row
	}
	
	print "Test insert sql"
	conn.begin()
	conn.execute("insert into tbl_user (username, password, reg_date) values(:username, :password, :reg_date)", {
		// id = 10,
		reg_date = DateTime(2013, 04, 01, 10, 00),
		username = "user",
		password = "passs",
	})
	print "lastInsertId: ${conn.lastInsertId}"
	conn.commit()
}else{
	print "ODBO extension is not enabled"
}

if("Regexp" in _G){
	print "Test Regexp"
	
	print Regexp.escape("/(\d+)-(\d+)/", "/")
	
	print Regexp("/(\d+)-(\d+)/").replace("xyz-12-1977-abc", "$2-$1")
	print Regexp("/(\d+)-(\d+)/").replace("xyz-12-1977-abc", {|m, str| m[2].."-"..m[1] })

	print "xyz-12-1977-abc".replace(Regexp("/(\d+)-(\d+)/"), "$2-$1")
	print "xyz-12-1977-abc".replace(Regexp("/(\d+)-(\d+)/"), {|m, str| m[2].."-"..m[1] })

	var r = Regexp("/(\d+)/isug")
	print r.exec("123-456")
	print r.test("123-456")
	
	print "123 asfghg  76as hjasdjkah".split(Regexp("/\s+/"))

	print Regexp("#/(?P<year>\d{4})/(?P<month>\d{2})/((?P<id>\d{1,})|(?P<permalink>.{1,}))[/]{0,1}$#")
			.exec("/2011/10/Lorem-ipsum-dolor-it-amet-consectetur-adipisicing")
}else{
	print "Regexp library is not enabled"
}

;{
	print "Test var in string"
	var abc = {xyz = 123} // local variable
	var2 = "test" // environment (global) variable
	print "inject \${abc} ${abc.xyz + 7} ${var2}!"
	print 'inject ${abc} ${abc.xyz + 7} ${var2} \'test\' c:\\ \n \t'
}

;{
	print "Test multi line string with vars inside"
	var abc = {xyz = 123}
	var var2 = "test"
	var s = <<<END"

This is multi
line ${var2} string

${abc.xyz + 7}
END
	print s
	
	print "Test multi line text"
	var s = <<<END'
This is multi
line ${var2} text

${abc.xyz + 7}
END
	print s
	
	print <<<@==" ${abc} 
		string finished@==
	print <<<~~' ${abc} 
		string finished~~
}

;{
	print "Test pack/unpack"
	/**
		a	NUL-padded string
		A	SPACE-padded string
		h	Hex string, low nibble first
		H	Hex string, high nibble first
		c	signed char
		C	unsigned char
		s	signed short (always 16 bit, machine byte order)
		S	unsigned short (always 16 bit, machine byte order)
		n	unsigned short (always 16 bit, big endian byte order)
		v	unsigned short (always 16 bit, little endian byte order)
		i	signed integer (machine dependent size and byte order)
		I	unsigned integer (machine dependent size and byte order)
		l	signed long (always 32 bit, machine byte order)
		L	unsigned long (always 32 bit, machine byte order)
		N	unsigned long (always 32 bit, big endian byte order)
		V	unsigned long (always 32 bit, little endian byte order)
		f	float (machine dependent size and representation)
		d	double (machine dependent size and representation)
		x	NUL byte
		X	Back up one byte
		@	NUL-fill to absolute position	
	*/
	var binarydata = "nvc*".pack(0x1234, 0x5678, 65, 66)
	var a, b, c, d = binarydata.unpack("nvc*")
	printf("unpack: 0x%04x 0x%04x %d %d", a, b, c, d)
}

terminate()
print "This text is never printed"
