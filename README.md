ObjectScript
============

The ObjectScript is a new embedded programing language that mixes benefits of JavaScript, Lua, Ruby, Python and PHP. The ObjectScript has syntax from JavaScript, multiple results from Lua, sugar syntax from Ruby, magic methods from Python and much more.

The ObjectScript is universal scripting language, there are no compromises any more.

Please look at [OS-FCGI repo](https://github.com/unitpoint/os-fcgi) to get latest ObjectScript release files.

## Resources

* [Programming in ObjectScript](https://github.com/unitpoint/objectscript/wiki/Programming-in-ObjectScript)
* [ObjectScript Reference](https://github.com/unitpoint/objectscript/wiki/ObjectScript-Reference)
* [ObjectScript fastcgi daemon](https://github.com/unitpoint/os-fcgi)
* [objectscript.org](https://github.com/unitpoint/objectscript.org) is a demo of usage the ObjectScript language fastcgi daemon
* [cocos2d-os](https://github.com/unitpoint/cocos2d-os) is a game framework made with ObjectScript
* [ObjectScript C++ binder generator](https://github.com/unitpoint/objectscript/blob/master/source/os-binder-generator.os)
* [ObjectScript Markdown to Html converter](https://github.com/unitpoint/objectscript/blob/master/examples-os/md2html.os)

Compile and Install using Linux
===================

	mkdir build && cd build
	cmake -DCMAKE_INSTALL_PREFIX=$(pwd)/../ ..
	make 
	make install
	
The result files (os, oscript) will be located inside of bin folder.

Compile using Microsoft Visual Studio
===================

Please check proj.win32\examples.sln for more examples.

Run examples-os\test.cmd to start example. 

License
=======

ObjectScript is free software distributed under the terms of the MIT license reproduced below. ObjectScript may be used for any purpose, including commercial purposes, at absolutely no cost. No paperwork, no royalties, no GNU-like "copyleft" restrictions, either. Just download it and use it.

The spirit of the ObjectScript license is that you are free to use ObjectScript for any purpose at no cost without having to ask us. The only requirement is that if you do use ObjectScript, then you should give us credit by including the copyright notice somewhere in your product or its documentation. A nice, but optional, way to give us further credit is to include a ObjectScript logo and a link to our site in a web page for your product.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
