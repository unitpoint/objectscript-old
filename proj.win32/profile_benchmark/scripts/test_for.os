var start_time = getTimeSec()

var range = function(a, b){
  return function(){
    if(a <= b){
      return true, a++
    }
  }
}

fruits = {"apple":0,"orange":0,"banana":0}

for(var i in range(0, 1000000)){
  if(i % 2 == 1) fruits["apple"] = fruits["apple"] + 1
  if(i % 3 == 1) fruits["orange"] = fruits["orange"] + 1
  if(i % 5 == 1) fruits["banana"] = fruits["banana"] + 1
}

print (fruits["apple"])
print (fruits["orange"])
print (fruits["banana"])

printf("time: %.3f\n", getTimeSec() - start_time)
