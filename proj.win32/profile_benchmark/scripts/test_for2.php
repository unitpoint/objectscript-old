<?php

function getTimeSec(){
    list($usec, $sec) = explode(" ",microtime());
    return ($usec + $sec);
}
$start_time = getTimeSec();

$fruits = array("apple" => 0, "orange" => 0, "banana" => 0);

for($i = 0; $i <= 1000000; $i++){
  if($i % 2 == 1) $fruits["apple"] = $fruits["apple"] + 1;
  if($i % 3 == 1) $fruits["orange"] = $fruits["orange"] + 1;
  if($i % 5 == 1) $fruits["banana"] = $fruits["banana"] + 1;
}

print ($fruits["apple"]."\n");
print ($fruits["orange"]."\n");
print ($fruits["banana"]."\n");

printf("time: %.3f\n", getTimeSec() - $start_time);
