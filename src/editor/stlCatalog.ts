export interface CatalogItem {
  label: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
  kind?: string;
}

export const CXX_HEADERS: CatalogItem[] = [
  { label: 'iostream', detail: 'Standard Input/Output Streams' },
  { label: 'vector', detail: 'Dynamic array sequence container' },
  { label: 'string', detail: 'Standard string class' },
  { label: 'algorithm', detail: 'Standard algorithms (sort, find, etc.)' },
  { label: 'map', detail: 'Ordered key-value associative container' },
  { label: 'set', detail: 'Ordered unique elements container' },
  { label: 'unordered_map', detail: 'Hash map container' },
  { label: 'unordered_set', detail: 'Hash set container' },
  { label: 'queue', detail: 'FIFO queue and priority queue' },
  { label: 'stack', detail: 'LIFO stack adapter' },
  { label: 'deque', detail: 'Double-ended queue' },
  { label: 'cmath', detail: 'Common mathematical functions' },
  { label: 'numeric', detail: 'Generalized numeric operations (accumulate, iota, gcd)' },
  { label: 'utility', detail: 'General utilities (pair, move, forward)' },
  { label: 'memory', detail: 'Smart pointers (unique_ptr, shared_ptr)' },
  { label: 'tuple', detail: 'Fixed-size collection of heterogeneous values' },
  { label: 'chrono', detail: 'Time utilities and clocks' },
  { label: 'bitset', detail: 'Fixed-size sequence of N bits' },
  { label: 'array', detail: 'Fixed-size contiguous array' },
  { label: 'sstream', detail: 'String stream classes' },
  { label: 'iomanip', detail: 'Input/output manipulators (setw, setprecision)' },
  { label: 'functional', detail: 'Function objects, std::function, bind' },
  { label: 'limits', detail: 'Numeric limits properties' },
  { label: 'ranges', detail: 'C++20 ranges library' },
  { label: 'span', detail: 'C++20 non-owning contiguous sequence view' },
  { label: 'format', detail: 'C++20 formatting library' },
  { label: 'optional', detail: 'Optional object wrapper' },
  { label: 'variant', detail: 'Type-safe union' },
  { label: 'bits/stdc++.h', detail: 'Precompiled header shim including all STL' }
];

export const CXX_KEYWORDS = [
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'atomic_cancel', 'atomic_commit', 'atomic_noexcept',
  'auto', 'bitand', 'bitor', 'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t',
  'char32_t', 'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast',
  'continue', 'co_await', 'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do', 'double',
  'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend',
  'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq',
  'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected', 'public', 'reflexpr', 'register',
  'reinterpret_cast', 'requires', 'return', 'short', 'signed', 'sizeof', 'static', 'static_assert',
  'static_cast', 'struct', 'switch', 'synchronized', 'template', 'this', 'thread_local', 'throw',
  'true', 'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void',
  'volatile', 'wchar_t', 'while', 'xor', 'xor_eq'
];

export const STD_MEMBERS: CatalogItem[] = [
  // Types
  { label: 'vector', detail: 'std::vector<T>', insertText: 'vector<${1:int}> ${2:vec};' },
  { label: 'string', detail: 'std::string', insertText: 'string' },
  { label: 'map', detail: 'std::map<Key, Value>', insertText: 'map<${1:int}, ${2:int}> ${3:mp};' },
  { label: 'set', detail: 'std::set<T>', insertText: 'set<${1:int}> ${2:st};' },
  { label: 'unordered_map', detail: 'std::unordered_map<Key, Value>', insertText: 'unordered_map<${1:int}, ${2:int}> ${3:mp};' },
  { label: 'unordered_set', detail: 'std::unordered_set<T>', insertText: 'unordered_set<${1:int}> ${2:st};' },
  { label: 'pair', detail: 'std::pair<T1, T2>', insertText: 'pair<${1:int}, ${2:int}>' },
  { label: 'tuple', detail: 'std::tuple<Types...>', insertText: 'tuple<${1:int, int}>' },
  { label: 'queue', detail: 'std::queue<T>', insertText: 'queue<${1:int}> ${2:q};' },
  { label: 'stack', detail: 'std::stack<T>', insertText: 'stack<${1:int}> ${2:stk};' },
  { label: 'priority_queue', detail: 'std::priority_queue<T>', insertText: 'priority_queue<${1:int}> ${2:pq};' },
  { label: 'deque', detail: 'std::deque<T>', insertText: 'deque<${1:int}> ${2:dq};' },
  { label: 'array', detail: 'std::array<T, N>', insertText: 'array<${1:int}, ${2:10}> ${3:arr};' },
  { label: 'unique_ptr', detail: 'std::unique_ptr<T>', insertText: 'unique_ptr<${1:Type}>' },
  { label: 'shared_ptr', detail: 'std::shared_ptr<T>', insertText: 'shared_ptr<${1:Type}>' },
  { label: 'make_unique', detail: 'std::make_unique<T>(args...)', insertText: 'make_unique<${1:Type}>(${2})' },
  { label: 'make_shared', detail: 'std::make_shared<T>(args...)', insertText: 'make_shared<${1:Type}>(${2})' },
  { label: 'make_pair', detail: 'std::make_pair(a, b)', insertText: 'make_pair(${1:a}, ${2:b})' },
  { label: 'optional', detail: 'std::optional<T>', insertText: 'optional<${1:int}>' },
  { label: 'span', detail: 'std::span<T>', insertText: 'span<${1:int}>' },

  // Streams & IO
  { label: 'cout', detail: 'Standard output stream', insertText: 'cout << ${1} << "\\n";' },
  { label: 'cin', detail: 'Standard input stream', insertText: 'cin >> ${1};' },
  { label: 'cerr', detail: 'Standard error stream', insertText: 'cerr << ${1} << "\\n";' },
  { label: 'endl', detail: 'Inserts newline and flushes stream', insertText: 'endl' },
  { label: 'ios_base', detail: 'Base class for streams' },
  { label: 'stringstream', detail: 'Stream for operating on strings' },

  // Algorithms & Functions
  { label: 'sort', detail: 'Sort elements in range [first, last)', insertText: 'sort(${1:v.begin()}, ${2:v.end()});' },
  { label: 'reverse', detail: 'Reverse elements in range [first, last)', insertText: 'reverse(${1:v.begin()}, ${2:v.end()});' },
  { label: 'min', detail: 'Return the smaller of two values', insertText: 'min(${1:a}, ${2:b})' },
  { label: 'max', detail: 'Return the greater of two values', insertText: 'max(${1:a}, ${2:b})' },
  { label: 'clamp', detail: 'Clamp value between low and high', insertText: 'clamp(${1:val}, ${2:low}, ${3:high})' },
  { label: 'swap', detail: 'Exchange values of two objects', insertText: 'swap(${1:a}, ${2:b});' },
  { label: 'find', detail: 'Find element in range', insertText: 'find(${1:v.begin()}, ${2:v.end()}, ${3:val})' },
  { label: 'binary_search', detail: 'Test if value exists in sorted sequence', insertText: 'binary_search(${1:v.begin()}, ${2:v.end()}, ${3:val})' },
  { label: 'lower_bound', detail: 'First element not less than value', insertText: 'lower_bound(${1:v.begin()}, ${2:v.end()}, ${3:val})' },
  { label: 'upper_bound', detail: 'First element greater than value', insertText: 'upper_bound(${1:v.begin()}, ${2:v.end()}, ${3:val})' },
  { label: 'accumulate', detail: 'Sum up elements in range', insertText: 'accumulate(${1:v.begin()}, ${2:v.end()}, ${3:0})' },
  { label: 'iota', detail: 'Fill range with successive values', insertText: 'iota(${1:v.begin()}, ${2:v.end()}, ${3:0});' },
  { label: 'count', detail: 'Count occurrences in range', insertText: 'count(${1:v.begin()}, ${2:v.end()}, ${3:val})' },
  { label: 'fill', detail: 'Fill range with value', insertText: 'fill(${1:v.begin()}, ${2:v.end()}, ${3:val});' },
  { label: 'to_string', detail: 'Convert numerical value to std::string', insertText: 'to_string(${1:val})' },
  { label: 'stoi', detail: 'Convert string to int', insertText: 'stoi(${1:str})' },
  { label: 'stod', detail: 'Convert string to double', insertText: 'stod(${1:str})' },
  { label: 'gcd', detail: 'Greatest common divisor', insertText: 'gcd(${1:a}, ${2:b})' },
  { label: 'lcm', detail: 'Least common multiple', insertText: 'lcm(${1:a}, ${2:b})' },
  { label: 'sqrt', detail: 'Square root', insertText: 'sqrt(${1:val})' },
  { label: 'pow', detail: 'Power function', insertText: 'pow(${1:base}, ${2:exp})' }
];

export const CONTAINER_METHODS: CatalogItem[] = [
  { label: 'size', detail: 'Returns the number of elements', insertText: 'size()' },
  { label: 'empty', detail: 'Checks whether the container is empty', insertText: 'empty()' },
  { label: 'push_back', detail: 'Adds an element to the end', insertText: 'push_back(${1:value});' },
  { label: 'pop_back', detail: 'Removes the last element', insertText: 'pop_back();' },
  { label: 'emplace_back', detail: 'Constructs an element in-place at the end', insertText: 'emplace_back(${1:args});' },
  { label: 'push', detail: 'Inserts element at the end / top', insertText: 'push(${1:value});' },
  { label: 'pop', detail: 'Removes the top / front element', insertText: 'pop();' },
  { label: 'top', detail: 'Accesses the top element', insertText: 'top()' },
  { label: 'front', detail: 'Accesses the first element', insertText: 'front()' },
  { label: 'back', detail: 'Accesses the last element', insertText: 'back()' },
  { label: 'insert', detail: 'Inserts elements', insertText: 'insert(${1:value});' },
  { label: 'erase', detail: 'Erases elements', insertText: 'erase(${1:iter});' },
  { label: 'find', detail: 'Finds element with specific key', insertText: 'find(${1:key})' },
  { label: 'count', detail: 'Returns the number of elements matching specific key', insertText: 'count(${1:key})' },
  { label: 'clear', detail: 'Clears the contents', insertText: 'clear();' },
  { label: 'begin', detail: 'Returns an iterator to the beginning', insertText: 'begin()' },
  { label: 'end', detail: 'Returns an iterator to the end', insertText: 'end()' },
  { label: 'rbegin', detail: 'Returns a reverse iterator to the beginning', insertText: 'rbegin()' },
  { label: 'rend', detail: 'Returns a reverse iterator to the end', insertText: 'rend()' },
  { label: 'at', detail: 'Access specified element with bounds checking', insertText: 'at(${1:index})' },
  { label: 'data', detail: 'Direct access to the underlying array', insertText: 'data()' },
  { label: 'reserve', detail: 'Reserves storage', insertText: 'reserve(${1:n});' },
  { label: 'resize', detail: 'Changes the number of elements stored', insertText: 'resize(${1:n});' },
  { label: 'substr', detail: 'Returns a substring', insertText: 'substr(${1:pos}, ${2:count})' },
  { label: 'length', detail: 'Returns number of characters', insertText: 'length()' },
  { label: 'c_str', detail: 'Returns a pointer to the character array', insertText: 'c_str()' }
];
