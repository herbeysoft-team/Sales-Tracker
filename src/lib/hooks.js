import { useEffect, useState } from 'react'
import {
  subscribeCustomers,
  subscribeCustomer,
  subscribeSales,
  subscribeMarketers,
  subscribePayments,
  subscribeAdjustments,
} from './firestore'

export function useCustomers(filters = {}) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const unsub = subscribeCustomers((data) => {
      setCustomers(data)
      setLoading(false)
    }, filters)
    return unsub
  }, [filters.marketerId])
  return { customers, loading }
}

export function useCustomer(customerId) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!customerId) return
    setLoading(true)
    const unsub = subscribeCustomer(customerId, (data) => {
      setCustomer(data)
      setLoading(false)
    })
    return unsub
  }, [customerId])
  return { customer, loading }
}

export function useSales(filters = {}) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const unsub = subscribeSales((data) => {
      setSales(data)
      setLoading(false)
    }, filters)
    return unsub
  }, [filters.marketerId, filters.customerId])
  return { sales, loading }
}

export function usePayments(filters = {}) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const unsub = subscribePayments((data) => {
      setPayments(data)
      setLoading(false)
    }, filters)
    return unsub
  }, [filters.customerId, filters.saleId, filters.marketerId])
  return { payments, loading }
}

export function useMarketers() {
  const [marketers, setMarketers] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const unsub = subscribeMarketers((data) => {
      setMarketers(data)
      setLoading(false)
    })
    return unsub
  }, [])
  return { marketers, loading }
}


export function useAdjustments(filters = {}) {
  const [adjustments, setAdjustments] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const unsub = subscribeAdjustments((data) => {
      setAdjustments(data)
      setLoading(false)
    }, filters)
    return unsub
  }, [filters.customerId])
  return { adjustments, loading }
}
