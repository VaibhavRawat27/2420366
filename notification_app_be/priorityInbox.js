/**
 * Weight mapping for priority hierarchy.
 * Placement (Highest) > Result (Medium) > Event (Lowest)
 */
const WEIGHTS = {
  placement: 3,
  result: 2,
  event: 1
};

/**
 * Returns the priority weight of a given notification type.
 * 
 * @param {string} type - Notification type.
 * @returns {number} Priority weight.
 */
export function getTypeWeight(type) {
  if (!type) return 0;
  return WEIGHTS[type.toLowerCase()] || 0;
}

/**
 * Parses timestamp string "YYYY-MM-DD HH:mm:ss" into epoch time.
 * 
 * @param {string} timestampStr - Timestamp string.
 * @returns {number} Epoch time in milliseconds.
 */
export function parseTimestamp(timestampStr) {
  if (!timestampStr) return 0;
  return Date.parse(timestampStr.replace(' ', 'T'));
}

/**
 * Checks if notification 'a' has higher priority than notification 'b'.
 * 
 * Priority rules:
 * 1. Weight: Placement > Result > Event
 * 2. Recency: Newer timestamp first
 * 
 * @param {Object} a - First notification.
 * @param {Object} b - Second notification.
 * @returns {boolean} True if 'a' has higher priority than 'b'.
 */
export function isHigherPriority(a, b) {
  const weightA = getTypeWeight(a.Type);
  const weightB = getTypeWeight(b.Type);

  if (weightA !== weightB) {
    return weightA > weightB;
  }

  const timeA = parseTimestamp(a.Timestamp);
  const timeB = parseTimestamp(b.Timestamp);
  return timeA > timeB;
}

/**
 * Standard comparator function for sorting notifications.
 * Returns negative if a has higher priority than b,
 * positive if b has higher priority than a,
 * and 0 if they are equal.
 */
export function compareNotifications(a, b) {
  if (isHigherPriority(a, b)) return -1;
  if (isHigherPriority(b, a)) return 1;
  return 0;
}

/**
 * A Min-Heap based Bounded Priority Queue to maintain the top N notifications efficiently.
 * 
 * The root (index 0) holds the element with the LOWEST priority in the queue.
 * This allows us to quickly compare and discard lower priority items in O(1) time
 * and perform insertions in O(log N) time.
 */
export class BoundedPriorityQueue {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.heap = [];
  }

  /**
   * Returns current size of the heap.
   */
  size() {
    return this.heap.length;
  }

  /**
   * Inserts an item into the queue. If queue is full, inserts only if
   * the item has higher priority than the lowest priority item in the queue.
   * 
   * Complexity: O(log maxSize)
   * 
   * @param {Object} item - Notification object.
   */
  insert(item) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this._bubbleUp(this.heap.length - 1);
    } else {
      // Queue is full. If the new item has HIGHER priority than the root (which has lowest priority):
      if (isHigherPriority(item, this.heap[0])) {
        this.heap[0] = item;
        this._sinkDown(0);
      }
    }
  }

  /**
   * Bubbles up element at index to restore heap property.
   */
  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      // If parent has higher priority than child, it violates the min-heap property.
      // We swap parent and child to bubble the lower priority child up.
      if (isHigherPriority(this.heap[parentIndex], this.heap[index])) {
        this._swap(index, parentIndex);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Sinks down element at index to restore heap property.
   */
  _sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      let lowestPriorityIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      // In a min-heap, we want the element with the lowest priority at the root.
      // So if leftChild has lower priority than lowestPriorityIndex:
      if (leftChild < length && isHigherPriority(this.heap[lowestPriorityIndex], this.heap[leftChild])) {
        lowestPriorityIndex = leftChild;
      }

      if (rightChild < length && isHigherPriority(this.heap[lowestPriorityIndex], this.heap[rightChild])) {
        lowestPriorityIndex = rightChild;
      }

      if (lowestPriorityIndex === index) {
        break;
      }

      this._swap(index, lowestPriorityIndex);
      index = lowestPriorityIndex;
    }
  }

  _swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  /**
   * Returns the top notifications sorted in descending priority (highest priority first).
   * 
   * Complexity: O(maxSize log maxSize)
   * 
   * @returns {Array} Sorted notifications.
   */
  getSortedList() {
    const heapCopy = [...this.heap];
    const sorted = [];
    
    // Extract elements one by one (this gives them in ascending order of priority)
    while (this.heap.length > 0) {
      this._swap(0, this.heap.length - 1);
      const minElement = this.heap.pop();
      this._sinkDown(0);
      sorted.push(minElement);
    }
    
    // Restore original heap state
    this.heap = heapCopy;
    
    // Reverse to return highest priority first
    return sorted.reverse();
  }
}
